const { BlobServiceClient, StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters } = require('@azure/storage-blob');

module.exports = async function (context, req) {
    context.log('Secure download request received', req.method);
    
    try {
        // For testing, return simple response for GET requests
        if (req.method === 'GET') {
            context.res = {
                status: 200,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,x-verified-email,x-verification-time'
                },
                body: { 
                    message: 'Secure download API is working',
                    method: req.method,
                    timestamp: new Date().toISOString()
                }
            };
            return;
        }
        
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            context.res = {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,x-verified-email,x-verification-time'
                },
                body: ''
            };
            return;
        }
        
        // Check if user has valid verification token
        const userEmail = req.headers['x-verified-email'];
        const verificationTime = req.headers['x-verification-time'];
        
        context.log(`=== SECURE DOWNLOAD DEBUG ===`);
        context.log(`Headers received:`, Object.keys(req.headers));
        context.log(`User email: '${userEmail}' (type: ${typeof userEmail})`);
        context.log(`Verification time: '${verificationTime}' (type: ${typeof verificationTime})`);
        context.log(`Email ends with @virginia.edu?`, userEmail ? userEmail.toLowerCase().endsWith('@virginia.edu') : 'NO EMAIL');
        
        if (!userEmail || !verificationTime) {
            context.res = {
                status: 401,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { error: 'Authentication required' }
            };
            return;
        }
        
        // Verify email domain
        context.log(`About to check email domain...`);
        context.log(`userEmail.toLowerCase(): '${userEmail.toLowerCase()}'`);
        context.log(`endsWith check result:`, userEmail.toLowerCase().endsWith('@virginia.edu'));
        
        if (!userEmail.toLowerCase().endsWith('@virginia.edu')) {
            context.res = {
                status: 403,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { error: 'Access restricted to @virginia.edu addresses' }
            };
            return;
        }
        
        // Check if verification is still valid (24 hours)
        const hoursSinceVerification = (Date.now() - parseInt(verificationTime)) / (1000 * 60 * 60);
        if (hoursSinceVerification > 24) {
            context.res = {
                status: 401,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { error: 'Verification expired. Please verify your email again.' }
            };
            return;
        }
        
        // Get file path from request body
        let filePath;
        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            filePath = body.file || req.query.file;
        } catch (e) {
            filePath = req.query.file;
        }
        
        if (!filePath) {
            context.res = {
                status: 400,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { error: 'File parameter required' }
            };
            return;
        }
        
        // Validate file path to prevent directory traversal
        if (filePath.includes('../') || filePath.includes('..\\')) {
            context.res = {
                status: 400,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { error: 'Invalid file path' }
            };
            return;
        }
        
        // Azure Storage configuration
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || 'projectexplorerfiles';
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'project-files';
        
        context.log(`=== AZURE STORAGE CONFIG ===`);
        context.log(`Account Name: ${accountName}`);
        context.log(`Container Name: ${containerName}`);
        context.log(`Account Key Present: ${!!accountKey}`);
        context.log(`File Path: ${filePath}`);
        
        if (!accountKey) {
            throw new Error('Azure Storage account key not configured');
        }
        
        // Create credentials and blob service client
        context.log('Creating storage credentials...');
        const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
        const blobServiceClient = new BlobServiceClient(
            `https://${accountName}.blob.core.windows.net`,
            sharedKeyCredential
        );
        
        context.log('Getting container and blob clients...');
        // Generate SAS token for the specific blob
        const containerClient = blobServiceClient.getContainerClient(containerName);
        const blobClient = containerClient.getBlobClient(filePath);
        
        context.log('Checking if blob exists...');
        // Check if blob exists
        const exists = await blobClient.exists();
        context.log(`Blob exists: ${exists}`);
        if (!exists) {
            context.res = {
                status: 404,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { error: 'File not found' }
            };
            return;
        }
        
        // Generate SAS token valid for 1 hour
        const sasOptions = {
            containerName: containerName,
            blobName: filePath,
            permissions: BlobSASPermissions.parse('r'), // Read permission only
            startsOn: new Date(),
            expiresOn: new Date(new Date().valueOf() + 3600 * 1000), // 1 hour from now
        };
        
        const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
        const downloadUrl = `${blobClient.url}?${sasToken}`;
        
        // Log the download for audit purposes
        context.log(`File download: ${filePath} by ${userEmail}`);
        
        context.res = {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                downloadUrl: downloadUrl,
                expiresIn: 3600,
                filename: filePath,
                userEmail: userEmail
            }
        };
        
    } catch (error) {
        context.log.error('Error in secure download function:', error);
        context.res = {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: { 
                error: 'Internal server error',
                details: error.message,
                stack: error.stack,
                errorType: error.constructor.name
            }
        };
    }
};