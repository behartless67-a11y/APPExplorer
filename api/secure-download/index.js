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
        
        // Get client IP address and clean it
        const clientIP = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection?.remoteAddress || 'unknown';
        let realIP = clientIP.split(',')[0].trim(); // Handle multiple IPs in x-forwarded-for
        
        // Remove port number if present (e.g., "199.111.240.7:41552" -> "199.111.240.7")
        if (realIP.includes(':') && !realIP.startsWith('[')) { // Don't remove from IPv6 addresses
            realIP = realIP.split(':')[0];
        }
        
        context.log(`=== IP-BASED ACCESS CONTROL ===`);
        context.log(`Client IP: ${realIP}`);
        context.log(`All headers:`, JSON.stringify(req.headers, null, 2));
        
        // UVA IP address ranges
        const uvaNetworks = [
            '137.54.0.0/16',     // UVA public block (confirmed from research)
            '172.16.0.0/12',     // UVA private networks (RFC 1918 - covers 172.16-172.31)
            '128.143.0.0/16',    // Additional UVA block (common for universities)  
            '199.111.0.0/16',    // UVA block from research
            '172.28.0.0/16'      // Specific range for testing (your building)
        ];
        
        function isValidIPv4(ip) {
            const ipRegex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
            const match = ip.match(ipRegex);
            if (!match) return false;
            
            return match.slice(1).every(octet => {
                const num = parseInt(octet, 10);
                return num >= 0 && num <= 255;
            });
        }
        
        function ip2long(ip) {
            if (!isValidIPv4(ip)) return null;
            const parts = ip.split('.');
            return ((parseInt(parts[0]) << 24) | 
                   (parseInt(parts[1]) << 16) | 
                   (parseInt(parts[2]) << 8) | 
                   parseInt(parts[3])) >>> 0;
        }
        
        function isIPInRange(ip, cidr) {
            try {
                if (!isValidIPv4(ip)) {
                    context.log(`Invalid IP format: ${ip}`);
                    return false;
                }
                
                const [range, bits] = cidr.split('/');
                if (!isValidIPv4(range)) {
                    context.log(`Invalid range format: ${range}`);
                    return false;
                }
                
                const maskBits = parseInt(bits, 10);
                if (isNaN(maskBits) || maskBits < 0 || maskBits > 32) {
                    context.log(`Invalid CIDR bits: ${bits}`);
                    return false;
                }
                
                const ipLong = ip2long(ip);
                const rangeLong = ip2long(range);
                
                if (ipLong === null || rangeLong === null) {
                    context.log(`Failed to convert IPs to long: ${ip}, ${range}`);
                    return false;
                }
                
                const mask = (0xFFFFFFFF << (32 - maskBits)) >>> 0;
                const result = (ipLong & mask) === (rangeLong & mask);
                
                context.log(`IP check: ${ip} (${ipLong}) in ${cidr} (${rangeLong}, mask: ${mask.toString(16)}) = ${result}`);
                return result;
                
            } catch (error) {
                context.log(`Error in isIPInRange: ${error.message}`);
                return false;
            }
        }
        
        // Check if client IP is in UVA network ranges
        let isUVANetwork = false;
        
        try {
            // Special handling for localhost/development
            if (realIP === '127.0.0.1' || realIP === 'localhost' || realIP === '::1' || realIP.startsWith('::ffff:127.')) {
                context.log('Localhost detected - allowing for development');
                isUVANetwork = true;
            } else {
                isUVANetwork = uvaNetworks.some(network => isIPInRange(realIP, network));
            }
            
            context.log(`IP ${realIP} is in UVA network: ${isUVANetwork}`);
            
        } catch (error) {
            context.log(`Error in IP validation: ${error.message}`);
            // On error, deny access for security
            context.res = {
                status: 500,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { 
                    error: 'Network validation error. Please try again.',
                    details: error.message,
                    clientIP: realIP
                }
            };
            return;
        }
        
        if (!isUVANetwork) {
            context.res = {
                status: 403,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { 
                    error: 'Access restricted to UVA network. Please connect to UVA VPN or on-campus network to download files.',
                    clientIP: realIP,
                    allowedNetworks: uvaNetworks
                }
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
                clientIP: realIP,
                timestamp: new Date().toISOString()
            }
        };
    }
};