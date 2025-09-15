module.exports = async function (context, req) {
    context.log('Test config request received');
    
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
    
    const configInfo = {
        timestamp: new Date().toISOString(),
        environmentVariables: {
            AZURE_STORAGE_ACCOUNT_NAME: process.env.AZURE_STORAGE_ACCOUNT_NAME || 'NOT_SET',
            AZURE_STORAGE_ACCOUNT_KEY: process.env.AZURE_STORAGE_ACCOUNT_KEY ? 'SET (length: ' + process.env.AZURE_STORAGE_ACCOUNT_KEY.length + ')' : 'NOT_SET',
            AZURE_STORAGE_CONTAINER_NAME: process.env.AZURE_STORAGE_CONTAINER_NAME || 'NOT_SET',
            AZURE_STORAGE_CONNECTION_STRING: process.env.AZURE_STORAGE_CONNECTION_STRING ? 'SET (length: ' + process.env.AZURE_STORAGE_CONNECTION_STRING.length + ')' : 'NOT_SET'
        },
        allEnvVars: Object.keys(process.env).filter(key => key.includes('AZURE') || key.includes('STORAGE')),
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch
    };
    
    context.log('Config info:', JSON.stringify(configInfo, null, 2));
    
    context.res = {
        status: 200,
        headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: configInfo
    };
};