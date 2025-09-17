const { BlobServiceClient } = require('@azure/storage-blob');
const multipart = require('parse-multipart-data');

module.exports = async function (context, req) {
    context.log('Project upload request received');

    try {
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

        // Get client IP for logging
        const clientIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection?.remoteAddress || 'unknown';
        let realIP = clientIP.split(',')[0].trim();

        if (realIP.includes(':') && !realIP.startsWith('[')) {
            realIP = realIP.split(':')[0];
        }

        context.log(`Project submission from IP: ${realIP}`);

        // Parse multipart form data
        let formData = {};
        let files = [];

        if (req.headers['content-type'] && req.headers['content-type'].includes('multipart/form-data')) {
            const boundary = req.headers['content-type'].split('boundary=')[1];
            const parts = multipart.parse(req.body, boundary);

            parts.forEach(part => {
                if (part.filename) {
                    // This is a file
                    files.push({
                        fieldname: part.name,
                        filename: part.filename,
                        data: part.data,
                        type: part.type
                    });
                } else {
                    // This is form data
                    formData[part.name] = part.data.toString();
                }
            });
        } else {
            // Handle JSON form data
            formData = req.body || {};
        }

        context.log('Form data received:', Object.keys(formData));
        context.log('Files received:', files.length);

        // Extract submission metadata
        const submissionData = {
            title: formData.title || 'Untitled Project',
            summary: formData.summary || '',
            studentName: formData.name || formData.studentName || '',
            instructor: formData.instructor || '',
            projectStartTerm: formData.project_start_term || formData.projectStartTerm || '',
            problemLevel: formData.problem_level || formData.problemLevel || '',
            clientOrgName: formData.client_org_name || formData.clientOrgName || '',
            clientOrgType: formData.client_org_type || formData.clientOrgType || '',
            clientContactName: formData.client_contact_name || formData.clientContactName || '',
            clientContactTitle: formData.client_contact_title || formData.clientContactTitle || '',
            geographicScope: formData.geographic_scope_of_this_applied_policy_project || formData.geographicScope || '',
            comments: formData.comments || '',
            submittedAt: new Date().toISOString(),
            submittedFrom: realIP,
            status: 'pending_review'
        };

        // Validate required fields
        if (!submissionData.title || !submissionData.studentName || !submissionData.instructor) {
            context.res = {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: {
                    error: 'Missing required fields',
                    required: ['title', 'studentName', 'instructor']
                }
            };
            return;
        }

        // Generate unique submission ID
        const submissionId = `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        submissionData.submissionId = submissionId;

        // Azure Storage configuration
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'projectexplorerfiles';
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'project-files';

        if (!accountKey) {
            context.log('Azure Storage account key not configured');
            context.res = {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { error: 'Storage configuration error' }
            };
            return;
        }

        // Create blob service client
        const blobServiceClient = BlobServiceClient.fromConnectionString(
            `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`
        );
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Process uploaded files
        const uploadedFiles = [];
        let mainProjectFile = null;

        for (const file of files) {
            try {
                // Create safe filename
                const sanitizedName = submissionData.studentName
                    .replace(/[^a-zA-Z0-9]/g, '')
                    .substring(0, 20);

                const originalExt = file.filename.split('.').pop();
                const blobFileName = `projects/${sanitizedName}_${submissionId}_${file.filename}`;

                const blockBlobClient = containerClient.getBlockBlobClient(blobFileName);

                // Upload file to blob storage
                await blockBlobClient.upload(file.data, file.data.length, {
                    blobHTTPHeaders: {
                        blobContentType: file.type || 'application/octet-stream'
                    }
                });

                const uploadedFile = {
                    originalName: file.filename,
                    blobName: blobFileName,
                    size: file.data.length,
                    uploadedAt: new Date().toISOString()
                };

                uploadedFiles.push(uploadedFile);

                // Set main project file (prefer files with "project" in name or first PDF)
                if (!mainProjectFile ||
                    file.filename.toLowerCase().includes('project') ||
                    file.filename.toLowerCase().endsWith('.pdf')) {
                    mainProjectFile = uploadedFile;
                }

                context.log(`File uploaded: ${file.filename} -> ${blobFileName}`);

            } catch (fileError) {
                context.log(`Error uploading file ${file.filename}:`, fileError);
            }
        }

        // Add file information to submission data
        submissionData.uploadedFiles = uploadedFiles;
        submissionData.mainProjectFile = mainProjectFile;

        // Save submission metadata to blob storage
        const metadataFileName = `submissions/${submissionId}_metadata.json`;
        const metadataBlobClient = containerClient.getBlockBlobClient(metadataFileName);

        await metadataBlobClient.upload(
            JSON.stringify(submissionData, null, 2),
            JSON.stringify(submissionData, null, 2).length,
            {
                blobHTTPHeaders: {
                    blobContentType: 'application/json'
                }
            }
        );

        context.log(`Submission completed: ${submissionId}, Files: ${uploadedFiles.length}`);

        // Response
        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                success: true,
                message: `Project "${submissionData.title}" submitted successfully! Files uploaded: ${uploadedFiles.length}`,
                submissionId: submissionId,
                submission: {
                    title: submissionData.title,
                    studentName: submissionData.studentName,
                    instructor: submissionData.instructor,
                    status: submissionData.status,
                    filesUploaded: uploadedFiles.length,
                    submittedAt: submissionData.submittedAt
                },
                files: uploadedFiles.map(f => ({ name: f.originalName, size: f.size }))
            }
        };

    } catch (error) {
        context.log.error('Error in project upload function:', error);

        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                error: 'Internal server error during project submission',
                details: error.message,
                timestamp: new Date().toISOString()
            }
        };
    }
};
