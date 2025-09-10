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
        
        context.log(`Request from: ${userEmail}, Time: ${verificationTime}`);
        
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
        
        // For now, we'll make the blob storage public temporarily to test the flow
        // In production, you'd want to use SAS tokens, but that requires the Azure SDK
        const directUrl = `https://projectexplorerfiles.blob.core.windows.net/project-files/${encodeURIComponent(filePath)}`;
        
        // Log the download for audit purposes
        context.log(`File download: ${filePath} by ${userEmail}`);
        
        context.res = {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: {
                downloadUrl: directUrl,
                expiresIn: 3600, // Not actually expiring, but keeping the interface
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
                details: error.message
            }
        };
    }
};