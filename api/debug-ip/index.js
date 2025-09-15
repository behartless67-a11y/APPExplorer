module.exports = async function (context, req) {
    context.log('Debug IP request received');
    
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
    
    // Get all possible IP sources
    const xForwardedFor = req.headers['x-forwarded-for'];
    const xRealIP = req.headers['x-real-ip'];
    const xClientIP = req.headers['x-client-ip'];
    const remoteAddress = req.connection?.remoteAddress;
    const socketRemoteAddress = req.socket?.remoteAddress;
    
    // Parse the forwarded-for header
    let clientIPs = [];
    if (xForwardedFor) {
        clientIPs = xForwardedFor.split(',').map(ip => ip.trim());
    }
    
    const debugInfo = {
        timestamp: new Date().toISOString(),
        headers: {
            'x-forwarded-for': xForwardedFor,
            'x-real-ip': xRealIP,
            'x-client-ip': xClientIP,
            'user-agent': req.headers['user-agent'],
            'host': req.headers['host']
        },
        connection: {
            remoteAddress: remoteAddress,
            socketRemoteAddress: socketRemoteAddress
        },
        clientIPs: clientIPs,
        selectedIP: clientIPs[0] || xRealIP || remoteAddress || 'unknown',
        allHeaders: req.headers
    };
    
    // Check if the selected IP is in UVA ranges
    const uvaNetworks = [
        '137.54.0.0/16',
        '172.16.0.0/12',
        '128.143.0.0/16',
        '199.111.0.0/16'
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
            if (!isValidIPv4(ip)) return false;
            
            const [range, bits] = cidr.split('/');
            if (!isValidIPv4(range)) return false;
            
            const maskBits = parseInt(bits, 10);
            if (isNaN(maskBits) || maskBits < 0 || maskBits > 32) return false;
            
            const ipLong = ip2long(ip);
            const rangeLong = ip2long(range);
            
            if (ipLong === null || rangeLong === null) return false;
            
            const mask = (0xFFFFFFFF << (32 - maskBits)) >>> 0;
            return (ipLong & mask) === (rangeLong & mask);
            
        } catch (error) {
            return false;
        }
    }
    
    // Test each IP against UVA ranges
    debugInfo.uvaNetworkTests = {};
    const testIPs = [debugInfo.selectedIP, ...clientIPs].filter(ip => ip && isValidIPv4(ip));
    
    for (const ip of testIPs) {
        debugInfo.uvaNetworkTests[ip] = {
            isValid: isValidIPv4(ip),
            ranges: {}
        };
        
        for (const network of uvaNetworks) {
            debugInfo.uvaNetworkTests[ip].ranges[network] = isIPInRange(ip, network);
        }
        
        debugInfo.uvaNetworkTests[ip].isUVANetwork = Object.values(debugInfo.uvaNetworkTests[ip].ranges).some(Boolean);
    }
    
    context.log('Debug info:', JSON.stringify(debugInfo, null, 2));
    
    context.res = {
        status: 200,
        headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: debugInfo
    };
};