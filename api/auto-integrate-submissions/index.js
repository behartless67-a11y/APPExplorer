const { BlobServiceClient } = require('@azure/storage-blob');
const fs = require('fs');

module.exports = async function (context, req) {
    context.log('Auto-integration request received');

    try {
        // Handle CORS
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

        // Azure Storage configuration
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'projectexplorerfiles';
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'project-files';

        if (!accountKey) {
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

        const blobServiceClient = BlobServiceClient.fromConnectionString(
            `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`
        );
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // Get list of unprocessed submissions
        const unprocessedSubmissions = [];
        const processedFile = 'processed-submissions.json';

        let processedSubmissions = {};
        try {
            const processedBlobClient = containerClient.getBlobClient(processedFile);
            const processedData = await processedBlobClient.download();
            const chunks = [];
            for await (const chunk of processedData.readableStreamBody) {
                chunks.push(chunk);
            }
            processedSubmissions = JSON.parse(Buffer.concat(chunks).toString());
        } catch (e) {
            // File doesn't exist yet, start with empty object
            context.log('No processed submissions file found, starting fresh');
        }

        // Scan for submission metadata files
        for await (const blob of containerClient.listBlobsFlat()) {
            if (blob.name.startsWith('submissions/') && blob.name.endsWith('_metadata.json')) {
                const submissionId = blob.name.split('/')[1].replace('_metadata.json', '');

                if (!processedSubmissions[submissionId]) {
                    // This is a new, unprocessed submission
                    try {
                        const metadataBlobClient = containerClient.getBlobClient(blob.name);
                        const metadataResponse = await metadataBlobClient.download();

                        const chunks = [];
                        for await (const chunk of metadataResponse.readableStreamBody) {
                            chunks.push(chunk);
                        }
                        const metadataContent = Buffer.concat(chunks).toString();
                        const submissionData = JSON.parse(metadataContent);

                        // Auto-approve and integrate the submission
                        const newProject = {
                            title: submissionData.title,
                            summary: submissionData.summary || 'No summary provided',
                            instructor: submissionData.instructor || 'Unknown',
                            client_org_type: submissionData.clientOrgType || 'Unknown',
                            problem_level: submissionData.problemLevel || 'Unknown',
                            geographic_scope_of_this_applied_policy_project: submissionData.geographicScope || 'Unknown',
                            student_name: submissionData.studentName,
                            submission_id: submissionData.submissionId,
                            submitted_at: submissionData.submittedAt,
                            status: 'auto_approved'
                        };

                        // Get the main project file for download index
                        let downloadFileName = null;
                        if (submissionData.mainProjectFile) {
                            downloadFileName = submissionData.mainProjectFile.blobName;
                        } else if (submissionData.uploadedFiles && submissionData.uploadedFiles.length > 0) {
                            downloadFileName = submissionData.uploadedFiles[0].blobName;
                        }

                        if (downloadFileName) {
                            // Add to unprocessed list for integration
                            unprocessedSubmissions.push({
                                project: newProject,
                                downloadFile: downloadFileName,
                                submissionId: submissionId
                            });
                        }

                    } catch (parseError) {
                        context.log(`Error processing submission ${submissionId}:`, parseError);
                    }
                }
            }
        }

        context.log(`Found ${unprocessedSubmissions.length} new submissions to integrate`);

        // For this API, we'll return the list of submissions that would be integrated
        // In a real implementation, you'd want to actually update the app.html DATA object
        // and redeploy, but that requires more complex CI/CD integration

        const response = {
            success: true,
            newSubmissions: unprocessedSubmissions.length,
            submissions: unprocessedSubmissions.map(sub => ({
                title: sub.project.title,
                student: sub.project.student_name,
                instructor: sub.project.instructor,
                submissionId: sub.submissionId,
                filters: {
                    problem_level: sub.project.problem_level,
                    geographic_scope: sub.project.geographic_scope_of_this_applied_policy_project,
                    client_org_type: sub.project.client_org_type
                }
            })),
            message: unprocessedSubmissions.length > 0
                ? `Found ${unprocessedSubmissions.length} new submissions ready for integration`
                : 'No new submissions to process'
        };

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: response
        };

    } catch (error) {
        context.log.error('Error in auto-integration:', error);

        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                error: 'Error processing submissions',
                details: error.message,
                timestamp: new Date().toISOString()
            }
        };
    }
};