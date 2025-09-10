const { BlobServiceClient } = require('@azure/storage-blob');

module.exports = async function (context, req) {
    context.log('Secure download request received');
    
    try {
        // Check if user has valid verification token
        const userEmail = req.headers['x-verified-email'];
        const verificationTime = req.headers['x-verification-time'];
        
        if (!userEmail || !verificationTime) {
            context.res = {
                status: 401,
                body: { error: 'Authentication required' }
            };
            return;
        }
        
        // Verify email domain
        if (!userEmail.toLowerCase().endsWith('@virginia.edu')) {
            context.res = {
                status: 403,
                body: { error: 'Access restricted to @virginia.edu addresses' }
            };
            return;
        }
        
        // Check if verification is still valid (24 hours)
        const hoursSinceVerification = (Date.now() - parseInt(verificationTime)) / (1000 * 60 * 60);
        if (hoursSinceVerification > 24) {
            context.res = {
                status: 401,
                body: { error: 'Verification expired. Please verify your email again.' }
            };
            return;
        }
        
        // Get file path from query parameters
        const filePath = req.query.file;
        if (!filePath) {
            context.res = {
                status: 400,
                body: { error: 'File parameter required' }
            };
            return;
        }
        
        // Validate file path to prevent directory traversal
        if (filePath.includes('../') || filePath.includes('..\\')) {
            context.res = {
                status: 400,
                body: { error: 'Invalid file path' }
            };
            return;
        }
        
        // Azure Storage configuration
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'projects';
        
        if (!accountName || !accountKey) {
            context.log.error('Azure Storage credentials not configured');
            context.res = {
                status: 500,
                body: { error: 'Storage configuration error' }
            };
            return;
        }
        
        // Create blob service client
        const blobServiceClient = new BlobServiceClient(
            `https://${accountName}.blob.core.windows.net`,
            {
                account: accountName,
                accountKey: accountKey
            }
        );
        
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(filePath);
        
        // Check if file exists
        const exists = await blobClient.exists();
        if (!exists) {
            context.res = {
                status: 404,
                body: { error: 'File not found' }
            };
            return;
        }
        
        // Generate SAS token (valid for 1 hour)
        const { generateBlobSASQueryParameters, BlobSASPermissions } = require('@azure/storage-blob');
        const sasOptions = {
            containerName: containerName,
            blobName: filePath,
            permissions: BlobSASPermissions.parse('r'), // Read only
            startsOn: new Date(),
            expiresOn: new Date(new Date().valueOf() + 60 * 60 * 1000), // 1 hour
        };
        
        const sasToken = generateBlobSASQueryParameters(sasOptions, {
            account: accountName,
            accountKey: accountKey
        }).toString();
        
        const downloadUrl = `${blobClient.url}?${sasToken}`;
        
        // Log the download for audit purposes
        context.log(`File download: ${filePath} by ${userEmail}`);
        
        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                downloadUrl: downloadUrl,
                expiresIn: 3600 // 1 hour in seconds
            }
        };
        
    } catch (error) {
        context.log.error('Error in secure download function:', error);
        context.res = {
            status: 500,
            body: { error: 'Internal server error' }
        };
    }
};