const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function (context, req) {
    context.log('Check submissions request received');

    try {
        // Handle CORS
        if (req.method === 'OPTIONS') {
            context.res = {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,OPTIONS',
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

        // Look for recent submissions (last 2 hours)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const recentFiles = [];
        const recentMetadata = [];

        context.log(`Looking for files uploaded after: ${twoHoursAgo.toISOString()}`);

        // Scan for recent files
        for await (const blob of containerClient.listBlobsFlat()) {
            const lastModified = new Date(blob.properties.lastModified);

            if (lastModified > twoHoursAgo) {
                if (blob.name.startsWith('submissions/') && blob.name.endsWith('_metadata.json')) {
                    recentMetadata.push({
                        name: blob.name,
                        lastModified: lastModified,
                        size: blob.properties.contentLength
                    });
                } else if (blob.name.includes('SUB_') || blob.name.toLowerCase().includes('demby')) {
                    recentFiles.push({
                        name: blob.name,
                        lastModified: lastModified,
                        size: blob.properties.contentLength
                    });
                }
            }
        }

        // Read metadata for recent submissions
        const submissions = [];
        for (const metadata of recentMetadata) {
            try {
                const blobClient = containerClient.getBlobClient(metadata.name);
                const downloadResponse = await blobClient.download();

                // Convert stream to text
                const chunks = [];
                for await (const chunk of downloadResponse.readableStreamBody) {
                    chunks.push(chunk);
                }
                const metadataContent = Buffer.concat(chunks).toString();
                const submissionData = JSON.parse(metadataContent);

                submissions.push({
                    metadata: metadata,
                    data: submissionData
                });

            } catch (parseError) {
                context.log(`Error reading metadata ${metadata.name}:`, parseError);
            }
        }

        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            searchWindow: `Files uploaded after ${twoHoursAgo.toISOString()}`,
            found: {
                projectFiles: recentFiles.length,
                submissions: submissions.length
            },
            recentFiles: recentFiles,
            submissions: submissions.map(sub => ({
                submissionId: sub.data.submissionId,
                title: sub.data.title,
                studentName: sub.data.studentName,
                instructor: sub.data.instructor,
                submittedAt: sub.data.submittedAt,
                filesUploaded: sub.data.uploadedFiles?.length || 0,
                files: sub.data.uploadedFiles?.map(f => ({
                    name: f.originalName,
                    size: f.size,
                    blobName: f.blobName
                })) || []
            }))
        };

        context.log(`Found ${recentFiles.length} recent files and ${submissions.length} submissions`);

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: response
        };

    } catch (error) {
        context.log.error('Error checking submissions:', error);

        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                error: 'Error checking submissions',
                details: error.message,
                timestamp: new Date().toISOString()
            }
        };
    }
};