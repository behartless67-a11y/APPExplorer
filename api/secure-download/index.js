// Test Azure Storage import first
let BlobServiceClient, StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters;
try {
    const azureStorage = require('@azure/storage-blob');
    BlobServiceClient = azureStorage.BlobServiceClient;
    StorageSharedKeyCredential = azureStorage.StorageSharedKeyCredential;
    BlobSASPermissions = azureStorage.BlobSASPermissions;
    generateBlobSASQueryParameters = azureStorage.generateBlobSASQueryParameters;
} catch (importError) {
    console.error('Failed to import @azure/storage-blob:', importError);
}

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
                    'Access-Control-Allow-Headers': 'Content-Type,x-ms-client-principal'
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
                    'Access-Control-Allow-Headers': 'Content-Type,x-ms-client-principal'
                },
                body: ''
            };
            return;
        }

        // Get user claims from Azure Static Web Apps authentication
        const userClaims = req.headers['x-ms-client-principal'];

        if (!userClaims) {
            context.res = {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: {
                    error: 'Authentication required. Please log in to download files.',
                    loginUrl: '/.auth/login/aad'
                }
            };
            return;
        }

        // Decode the base64 encoded user claims
        let claims, userEmail;
        try {
            claims = JSON.parse(Buffer.from(userClaims, 'base64').toString());
            userEmail = claims.userDetails || claims.userId || 'unknown';
            context.log('User authenticated:', userEmail);
            context.log('User claims:', JSON.stringify(claims, null, 2));
        } catch (error) {
            context.log.error('Failed to decode user claims:', error);
            context.res = {
                status: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: {
                    error: 'Invalid authentication token',
                    details: error.message
                }
            };
            return;
        }

        // Extract groups from claims
        const userGroups = [];
        if (claims.claims) {
            claims.claims.forEach(claim => {
                if (claim.typ === 'groups' || claim.typ === 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups') {
                    if (Array.isArray(claim.val)) {
                        userGroups.push(...claim.val);
                    } else {
                        userGroups.push(claim.val);
                    }
                }
            });
        }

        context.log('User groups:', userGroups);

        // Check if user has required group membership
        const hasStaffAccess = userGroups.some(group => group === 'FBS_StaffAll' || group.includes('FBS_StaffAll'));
        const hasCommunityAccess = userGroups.some(group => group === 'FBS_Community' || group.includes('FBS_Community'));

        if (!hasStaffAccess && !hasCommunityAccess) {
            context.res = {
                status: 403,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: {
                    error: 'Access denied. You must be a member of FBS_StaffAll or FBS_Community groups to download files.',
                    userEmail: userEmail,
                    userGroups: userGroups
                }
            };
            return;
        }

        context.log(`Access granted for user: ${userEmail} (groups: ${userGroups.join(', ')})`)
        
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
        
        // Check if Azure Storage was imported successfully
        if (!BlobServiceClient || !StorageSharedKeyCredential) {
            throw new Error('Azure Storage library not available - check package.json deployment');
        }
        
        // Create credentials and blob service client
        context.log('Creating storage credentials...');
        let sharedKeyCredential, blobServiceClient;
        try {
            sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
            blobServiceClient = new BlobServiceClient(
                `https://${accountName}.blob.core.windows.net`,
                sharedKeyCredential
            );
            context.log('Storage client created successfully');
        } catch (storageError) {
            context.log.error('Failed to create storage client:', storageError);
            throw new Error(`Storage client creation failed: ${storageError.message}`);
        }
        
        context.log('Getting container client...');
        const containerClient = blobServiceClient.getContainerClient(containerName);
        
        // First, test if we can access the container at all
        try {
            context.log('Testing container access...');
            const containerProps = await containerClient.getProperties();
            context.log('Container access successful');
        } catch (containerError) {
            context.log('Container access failed:', containerError.message);
            context.res = {
                status: 500,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { 
                    error: 'Container access failed',
                    details: containerError.message,
                    accountName: accountName,
                    containerName: containerName
                }
            };
            return;
        }
        
        context.log('Getting blob client...');
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
                body: { error: 'File not found', filePath: filePath }
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
        context.log(`File download: ${filePath} by user ${userEmail}`);

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
        context.log.error('Error stack:', error.stack);
        context.log.error('Error details:', {
            message: error.message,
            name: error.name,
            code: error.code,
            statusCode: error.statusCode
        });
        
        context.res = {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                error: 'Internal server error',
                details: error.message,
                errorName: error.name,
                errorCode: error.code,
                timestamp: new Date().toISOString()
            }
        };
    }
};