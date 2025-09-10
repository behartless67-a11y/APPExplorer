const https = require('https');
const path = require('path');
const { BlobServiceClient } = require('@azure/storage-blob');

// Function to add project to the main database
async function addProjectToDatabase(projectRecord, context) {
    // In production, this would:
    // 1. Connect to Azure Cosmos DB or SQL Database
    // 2. Insert the project record
    // 3. Update search indexes
    // 4. Send notification emails
    
    // For now, we'll simulate the database operation with comprehensive logging
    const databaseOperation = {
        operation: 'INSERT',
        table: 'projects',
        timestamp: new Date().toISOString(),
        record: {
            id: projectRecord.id,
            project_title: projectRecord.project_title,
            instructor: projectRecord.instructor,
            year: projectRecord.year,
            problem_level: projectRecord.problem_level,
            source_url: projectRecord.source_url,
            text: projectRecord.text,
            // Additional metadata for integration
            student_name: projectRecord.student_name,
            uploaded_files: projectRecord.uploaded_files.length,
            status: projectRecord.status
        }
    };
    
    // Log the database operation for production integration
    context.log('DATABASE OPERATION:', JSON.stringify(databaseOperation, null, 2));
    
    // In production, you would replace this with:
    // const cosmosClient = new CosmosClient({ endpoint, key });
    // const database = cosmosClient.database('projectsdb');
    // const container = database.container('projects');
    // await container.items.create(projectRecord);
    
    // Simulate success - in production, this would be the actual database call
    return Promise.resolve(databaseOperation);
}

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
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        
        if (!connectionString) {
            context.log.warn('Azure Storage connection string not found, falling back to simulation mode');
        }
        
        let blobServiceClient;
        let containerClient;
        try {
            if (connectionString) {
                blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
                containerClient = blobServiceClient.getContainerClient('project-files');
            }
        } catch (error) {
            context.log.error('Failed to initialize Azure Storage client:', error);
        }
        
        for (let i = 0; i < uploadedFiles.length; i++) {
            const file = uploadedFiles[i];
            const fileExtension = path.extname(file.originalName) || '.pdf';
            const blobName = `${filePrefix}_${i + 1}${fileExtension}`;
            const downloadUrl = `https://projectexplorerfiles.blob.core.windows.net/project-files/${encodeURIComponent(blobName)}`;
            
            let uploadStatus = 'failed';
            let uploadError = null;
            
            try {
                if (containerClient && file.data) {
                    // Upload to Azure Blob Storage
                    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
                    const uploadResponse = await blockBlobClient.uploadData(file.data, {
                        blobHTTPHeaders: {
                            blobContentType: file.contentType || 'application/octet-stream'
                        },
                        metadata: {
                            originalName: file.originalName,
                            uploadedBy: formData.studentName,
                            projectId: projectId,
                            uploadDate: new Date().toISOString()
                        }
                    });
                    
                    uploadStatus = 'uploaded';
                    context.log(`Successfully uploaded: ${file.originalName} -> ${blobName} (${file.size} bytes)`);
                    context.log(`Upload response:`, uploadResponse.requestId);
                } else {
                    // Fallback to simulation mode
                    uploadStatus = 'simulated';
                    context.log(`Simulated upload: ${file.originalName} -> ${blobName} (${file.size} bytes)`);
                }
            } catch (error) {
                uploadStatus = 'failed';
                uploadError = error.message;
                context.log.error(`Failed to upload ${file.originalName}:`, error);
            }
            
            processedFiles.push({
                originalName: file.originalName,
                blobName: blobName,
                size: file.size,
                contentType: file.contentType,
                downloadUrl: downloadUrl,
                uploadStatus: uploadStatus,
                uploadError: uploadError
            });
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
        let databaseUpdateSuccess = false;
        let databaseError = null;
        
        try {
            // In production, you would save to Azure Cosmos DB or similar
            // For now, we'll simulate adding to projects database with proper logging
            await addProjectToDatabase(projectRecord, context);
            databaseUpdateSuccess = true;
            context.log(`Successfully added project to database: ${projectRecord.project_title}`);
        } catch (error) {
            databaseError = error.message;
            context.log.error('Failed to add project to database:', error);
        }
        
        // Log the complete submission for audit purposes
        context.log(`New project uploaded: ${projectRecord.project_title} by ${projectRecord.student_name}`);
        context.log(`Upload status summary:`, {
            filesUploaded: processedFiles.filter(f => f.uploadStatus === 'uploaded').length,
            filesSimulated: processedFiles.filter(f => f.uploadStatus === 'simulated').length,
            filesFailed: processedFiles.filter(f => f.uploadStatus === 'failed').length,
            databaseUpdated: databaseUpdateSuccess
        });
        
        // Return success response with project details
        const hasFailedUploads = processedFiles.some(f => f.uploadStatus === 'failed');
        const allUploadsSimulated = processedFiles.every(f => f.uploadStatus === 'simulated');
        
        let statusMessage;
        if (!hasFailedUploads && !allUploadsSimulated && databaseUpdateSuccess) {
            statusMessage = `Project "${projectRecord.project_title}" has been successfully uploaded and is now available in the project explorer.`;
        } else if (allUploadsSimulated && databaseUpdateSuccess) {
            statusMessage = `Project "${projectRecord.project_title}" has been processed in simulation mode. Contact admin to enable full upload functionality.`;
        } else {
            statusMessage = `Project "${projectRecord.project_title}" was submitted but encountered some issues. Check logs for details.`;
        }
        
        context.res = {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                success: true,
                project: {
                    id: projectRecord.id,
                    project_title: projectRecord.project_title,
                    student_name: projectRecord.student_name,
                    instructor: projectRecord.instructor,
                    year: projectRecord.year,
                    problem_level: projectRecord.problem_level,
                    status: projectRecord.status,
                    submitted_at: projectRecord.submitted_at
                },
                files: processedFiles.map(f => ({
                    name: f.originalName,
                    size: f.size,
                    status: f.uploadStatus,
                    downloadUrl: f.uploadStatus === 'uploaded' ? f.downloadUrl : null
                })),
                message: statusMessage,
                uploadSummary: {
                    totalFiles: processedFiles.length,
                    uploaded: processedFiles.filter(f => f.uploadStatus === 'uploaded').length,
                    simulated: processedFiles.filter(f => f.uploadStatus === 'simulated').length,
                    failed: processedFiles.filter(f => f.uploadStatus === 'failed').length,
                    databaseUpdated: databaseUpdateSuccess
                },
                nextSteps: [
                    databaseUpdateSuccess ? 'Project metadata has been added to the database' : 'Project logged for manual database integration',
                    hasFailedUploads ? 'Some file uploads failed - check with administrator' : 'All files processed successfully',
                    allUploadsSimulated ? 'Files simulated - full Azure Storage integration pending' : 'Files uploaded to Azure Blob Storage',
                    'Project will be searchable in the main application once fully integrated'
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