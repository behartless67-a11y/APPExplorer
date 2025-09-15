module.exports = async function (context, req) {
    context.log('Test storage request received');
    
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
        // Test Azure Storage import
        context.log('Testing Azure Storage import...');
        const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
        context.log('Azure Storage import successful');
        
        // Test credentials
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'projectexplorerfiles';
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'project-files';
        
        if (!accountKey) {
            throw new Error('Azure Storage account key not configured');
        }
        
        context.log('Creating storage credentials...');
        const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
        context.log('Credentials created successfully');
        
        context.log('Creating blob service client...');
        const blobServiceClient = new BlobServiceClient(
            `https://${accountName}.blob.core.windows.net`,
            sharedKeyCredential
        );
        context.log('Blob service client created successfully');
        
        context.log('Getting container client...');
        const containerClient = blobServiceClient.getContainerClient(containerName);
        context.log('Container client created successfully');
        
        context.log('Testing container access...');
        const containerProps = await containerClient.getProperties();
        context.log('Container access successful!');
        
        // List all blobs in the container
        context.log('Listing blobs in container...');
        const blobs = [];
        for await (const blob of containerClient.listBlobsFlat()) {
            blobs.push({
                name: blob.name,
                size: blob.properties.contentLength,
                lastModified: blob.properties.lastModified,
                contentType: blob.properties.contentType
            });
        }
        context.log(`Found ${blobs.length} blobs in container`);
        
        context.res = {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                status: 'success',
                message: 'Azure Storage connection working!',
                accountName: accountName,
                containerName: containerName,
                containerExists: true,
                blobCount: blobs.length,
                blobs: blobs,
                timestamp: new Date().toISOString()
            }
        };
        
    } catch (error) {
        context.log.error('Storage test failed:', error);
        context.log.error('Error stack:', error.stack);
        
        context.res = {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                status: 'error',
                message: 'Azure Storage test failed',
                error: error.message,
                errorName: error.name,
                errorCode: error.code,
                timestamp: new Date().toISOString()
            }
        };
    }
};