module.exports = async function (context, req) {
    context.log('Secure download request received');
    
    try {
        // For testing, let's first return a simple response
        if (req.method === 'GET') {
            context.res = {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: 'Secure download API is working',
                    method: req.method,
                    timestamp: new Date().toISOString()
                })
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Authentication required' })
            };
            return;
        }
        
        // Verify email domain
        if (!userEmail.toLowerCase().endsWith('@virginia.edu')) {
            context.res = {
                status: 403,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Access restricted to @virginia.edu addresses' })
            };
            return;
        }
        
        // Check if verification is still valid (24 hours)
        const hoursSinceVerification = (Date.now() - parseInt(verificationTime)) / (1000 * 60 * 60);
        if (hoursSinceVerification > 24) {
            context.res = {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Verification expired. Please verify your email again.' })
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'File parameter required' })
            };
            return;
        }
        
        // Validate file path to prevent directory traversal
        if (filePath.includes('../') || filePath.includes('..\\')) {
            context.res = {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Invalid file path' })
            };
            return;
        }
        
        // Azure Storage configuration
        const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
        const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME || 'project-files';
        
        context.log(`Storage config: Account=${accountName}, Container=${containerName}, Key=${accountKey ? 'SET' : 'NOT SET'}`);
        
        if (!accountName || !accountKey) {
            context.log.error('Azure Storage credentials not configured');
            context.res = {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Storage configuration error' })
            };
            return;
        }
        
        // For now, return a simple redirect to the original blob URL for testing
        const directUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${encodeURIComponent(filePath)}`;
        
        context.log(`Redirecting to: ${directUrl}`);
        
        context.res = {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                downloadUrl: directUrl,
                expiresIn: 3600,
                debug: {
                    accountName,
                    containerName,
                    filePath,
                    userEmail
                }
            })
        };
        
    } catch (error) {
        context.log.error('Error in secure download function:', error);
        context.res = {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                error: 'Internal server error',
                details: error.message
            })
        };
    }
};