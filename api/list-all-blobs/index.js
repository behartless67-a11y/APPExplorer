module.exports = async function (context, req) {
    context.log('List all blobs request received');
    
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            body: ''
        };
        return;
    }
    
    try {
        // Import Azure Storage
        const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
        
        // Get credentials
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'projectexplorerfiles';
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'project-files';
        
        if (!accountKey) {
            throw new Error('Azure Storage account key not configured');
        }
        
        // Create client
        const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
        const blobServiceClient = new BlobServiceClient(
            `https://${accountName}.blob.core.windows.net`,
            sharedKeyCredential
        );
        
        const containerClient = blobServiceClient.getContainerClient(containerName);
        
        // List ALL blobs with pagination
        const allBlobs = [];
        let marker = undefined;
        let pageCount = 0;
        
        do {
            pageCount++;
            context.log(`Fetching page ${pageCount}...`);
            
            const listBlobsResponse = await containerClient.listBlobsFlat({
                maxPageSize: 1000
            }).byPage({ 
                continuationToken: marker,
                maxPageSize: 1000 
            });
            
            for await (const response of listBlobsResponse) {
                for (const blob of response.segment.blobItems) {
                    allBlobs.push({
                        name: blob.name,
                        size: blob.properties.contentLength,
                        lastModified: blob.properties.lastModified,
                        contentType: blob.properties.contentType
                    });
                }
                marker = response.continuationToken;
            }
        } while (marker);
        
        context.log(`Total blobs found: ${allBlobs.length}`);
        
        // Categorize blobs
        const categories = {
            projects: allBlobs.filter(b => b.name.startsWith('projects/')),
            root: allBlobs.filter(b => !b.name.includes('/')),
            other: allBlobs.filter(b => b.name.includes('/') && !b.name.startsWith('projects/'))
        };
        
        context.res = {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                status: 'success',
                totalBlobs: allBlobs.length,
                categories: {
                    projects: categories.projects.length,
                    root: categories.root.length,
                    other: categories.other.length
                },
                blobs: allBlobs,
                projectsBlobs: categories.projects.map(b => b.name.replace('projects/', '')),
                rootBlobs: categories.root.map(b => b.name),
                otherBlobs: categories.other.map(b => b.name),
                pagesFetched: pageCount,
                timestamp: new Date().toISOString()
            }
        };
        
    } catch (error) {
        context.log.error('Error listing blobs:', error);
        
        context.res = {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                status: 'error',
                message: 'Failed to list blobs',
                error: error.message,
                timestamp: new Date().toISOString()
            }
        };
    }
};