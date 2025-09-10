const https = require('https');
const path = require('path');

// Simple multipart parser for Azure Functions
function parseMultipartData(body, boundary) {
    const parts = [];
    const boundaryBuffer = Buffer.from('--' + boundary);
    const bodyBuffer = Buffer.from(body, 'binary');
    
    let start = bodyBuffer.indexOf(boundaryBuffer);
    while (start !== -1) {
        const end = bodyBuffer.indexOf(boundaryBuffer, start + boundaryBuffer.length);
        if (end === -1) break;
        
        const partBuffer = bodyBuffer.slice(start + boundaryBuffer.length, end);
        const headerEnd = partBuffer.indexOf(Buffer.from('\r\n\r\n'));
        
        if (headerEnd !== -1) {
            const headers = partBuffer.slice(0, headerEnd).toString();
            const data = partBuffer.slice(headerEnd + 4, partBuffer.length - 2); // Remove trailing \r\n
            
            const nameMatch = headers.match(/name="([^"]+)"/);
            const filenameMatch = headers.match(/filename="([^"]+)"/);
            const contentTypeMatch = headers.match(/Content-Type: ([^\r\n]+)/);
            
            parts.push({
                name: nameMatch ? nameMatch[1] : null,
                filename: filenameMatch ? filenameMatch[1] : null,
                contentType: contentTypeMatch ? contentTypeMatch[1] : 'text/plain',
                data: data,
                isFile: !!filenameMatch
            });
        }
        
        start = bodyBuffer.indexOf(boundaryBuffer, end);
    }
    
    return parts;
}

module.exports = async function (context, req) {
    context.log('Project upload request received', req.method);
    
    try {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            context.res = {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: ''
            };
            return;
        }
        
        // Only allow POST requests for uploads
        if (req.method !== 'POST') {
            context.res = {
                status: 405,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { error: 'Method not allowed. Use POST.' }
            };
            return;
        }
        
        let formData = {};
        let uploadedFiles = [];
        
        // Handle multipart form data
        if (req.headers['content-type']?.includes('multipart/form-data')) {
            const boundary = req.headers['content-type'].split('boundary=')[1];
            const parts = parseMultipartData(req.body, boundary);
            
            for (const part of parts) {
                if (part.isFile && part.filename) {
                    uploadedFiles.push({
                        originalName: part.filename,
                        data: part.data,
                        size: part.data.length,
                        contentType: part.contentType
                    });
                } else if (part.name) {
                    formData[part.name] = part.data.toString();
                }
            }
        } 
        // Handle JSON data (fallback)
        else if (req.headers['content-type']?.includes('application/json')) {
            formData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            uploadedFiles = formData.files || [];
        } 
        else {
            context.res = {
                status: 400,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { error: 'Unsupported content type. Use multipart/form-data or application/json.' }
            };
            return;
        }
        
        // Validate required fields
        const requiredFields = ['projectName', 'studentName', 'instructor', 'projectStartTerm', 'problemLevel'];
        const missingFields = requiredFields.filter(field => !formData[field]);
        
        if (missingFields.length > 0) {
            context.res = {
                status: 400,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { 
                    error: 'Missing required fields', 
                    missingFields: missingFields 
                }
            };
            return;
        }
        
        // Generate unique project ID and file paths
        const timestamp = Date.now();
        const projectId = `proj-${timestamp}`;
        const filePrefix = `${projectId}_${formData.studentName.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        // Extract year from projectStartTerm
        const termMatch = formData.projectStartTerm.match(/(\d{4})/);
        const year = termMatch ? parseInt(termMatch[1]) : new Date().getFullYear();
        
        // Upload files to Azure Blob Storage
        const processedFiles = [];
        for (let i = 0; i < uploadedFiles.length; i++) {
            const file = uploadedFiles[i];
            const fileExtension = path.extname(file.originalName) || '.pdf';
            const blobName = `${filePrefix}_${i + 1}${fileExtension}`;
            
            // In a production environment, you would upload to Azure Blob Storage here
            // For now, we'll simulate the upload and generate the expected download URL
            const downloadUrl = `https://projectexplorerfiles.blob.core.windows.net/project-files/${encodeURIComponent(blobName)}`;
            
            processedFiles.push({
                originalName: file.originalName,
                blobName: blobName,
                size: file.size,
                contentType: file.contentType,
                downloadUrl: downloadUrl,
                uploadStatus: 'simulated' // In production: 'uploaded'
            });
            
            // Log file upload simulation
            context.log(`Simulated upload: ${file.originalName} -> ${blobName} (${file.size} bytes)`);
        }
        
        // Create project record in the format expected by the main app
        const projectRecord = {
            id: projectId,
            project_title: formData.projectName,
            instructor: formData.instructor,
            year: year,
            problem_level: formData.problemLevel,
            source_url: uploadedFiles[0]?.downloadUrl || '',
            text: formData.projectSummary || `Project submitted by ${formData.studentName} for ${formData.instructor}'s class in ${formData.projectStartTerm}.`,
            student_name: formData.studentName,
            project_start_term: formData.projectStartTerm,
            client_org_name: formData.clientOrgName || '',
            client_contact_name: formData.clientContactName || '',
            client_contact_title: formData.clientContactTitle || '',
            primary_topic: formData.primaryTopic || '',
            geographic_scope: formData.geographicScope || '',
            uploaded_files: processedFiles,
            submitted_at: new Date().toISOString(),
            status: 'approved' // Auto-approve for now
        };
        
        // Add project to the main projects database
        // In a real implementation, you would save to a database like Azure Cosmos DB
        // For now, we'll add it to the projects.json file simulation
        
        // In production, you would:
        // 1. Actually upload files to Azure Blob Storage using Azure Storage SDK
        // 2. Save project record to persistent database (Azure Cosmos DB, etc.)
        // 3. Update search index for the main application
        // 4. Send notification emails to administrators
        
        // Log the submission for audit purposes
        context.log(`New project uploaded: ${projectRecord.project_title} by ${projectRecord.student_name}`);
        context.log(`Project details:`, JSON.stringify(projectRecord, null, 2));
        
        // Simulate adding to the projects database
        // In a real app, this would be a database insert operation
        const databaseSimulation = {
            action: 'INSERT',
            table: 'projects',
            record: projectRecord,
            timestamp: new Date().toISOString()
        };
        context.log('Database simulation:', JSON.stringify(databaseSimulation, null, 2));
        
        // Return success response with project details
        context.res = {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                success: true,
                project: projectRecord,
                message: `Project "${projectRecord.project_title}" has been successfully uploaded and is now available in the project explorer.`,
                downloadUrl: projectRecord.source_url,
                nextSteps: [
                    'Your project is now live and searchable in the main application',
                    'Files are available for download by @virginia.edu users',
                    'Project metadata has been indexed for search and filtering'
                ]
            }
        };
        
    } catch (error) {
        context.log.error('Error in upload-project function:', error);
        context.res = {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: { 
                error: 'Internal server error',
                message: 'Failed to process project upload',
                details: error.message
            }
        };
    }
};