# Azure AD (Entra ID) Integration Guide for APPExplorer

## Overview
This guide details how to implement Azure Active Directory authentication for the APPExplorer download system, replacing the current fake email verification with proper UVA institutional authentication.

## What We've Implemented So Far

### 1. Frontend Changes Made
- ✅ Added MSAL.js library reference: `<script src="https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js"></script>`
- ✅ Updated HTML authentication panel with Azure AD login UI
- ✅ Added CSS for loading spinner animation
- ✅ Created Azure AD configuration object (`msalConfig`)
- ✅ Implemented MSAL initialization and authentication functions

### 2. Code Structure Added
- `msalConfig`: Configuration object for Azure AD
- `initializeMSAL()`: Initialize MSAL instance and handle authentication state
- `signIn()`: Handle Azure AD login popup
- `signOut()`: Handle Azure AD logout
- `getAccessToken()`: Retrieve access token for API calls
- `updateAuthUI()`: Update UI based on authentication state

## What You Need To Complete

### Step 1: Configure Azure AD App Registration

**In Azure Portal (portal.azure.com):**

1. **Create App Registration**
   - Go to Azure Active Directory → App registrations → New registration
   - Name: "APPExplorer"
   - Supported account types: "Accounts in this organizational directory only (UVA only)"
   - Redirect URI: Select "Single-page application (SPA)" and enter: `https://calm-rock-0599eab0f.1.azurestaticapps.net/`

2. **Configure Authentication**
   - Under Authentication → Platform configurations → Single-page application
   - Add redirect URI: `https://calm-rock-0599eab0f.1.azurestaticapps.net/`
   - Enable "Access tokens" and "ID tokens" under Implicit grant and hybrid flows

3. **Set API Permissions**
   - Go to API permissions → Add a permission → Microsoft Graph → Delegated permissions
   - Add: `User.Read` (basic profile information)
   - Add: `GroupMember.Read.All` (for group-based access control)
   - Grant admin consent for UVA tenant

4. **Copy Configuration Values**
   - Application (client) ID: `[GUID]`
   - Directory (tenant) ID: `[GUID]` (This is UVA's tenant ID)

### Step 2: Update Configuration in app.html

**Replace these placeholders in the code:**
```javascript
const msalConfig = {
  auth: {
    clientId: "YOUR_CLIENT_ID", // Replace with your App Registration Client ID
    authority: "https://login.microsoftonline.com/YOUR_TENANT_ID", // Replace with UVA tenant ID
    redirectUri: window.location.origin,
  },
  // ... rest of config
};
```

**With your actual values:**
```javascript
const msalConfig = {
  auth: {
    clientId: "12345678-1234-1234-1234-123456789012", // Your actual Client ID
    authority: "https://login.microsoftonline.com/abcdefgh-1234-1234-1234-123456789012", // UVA's tenant ID
    redirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  }
};
```

### Step 3: Update Azure Function for Token Validation

**Create new file: `api/secure-download/package.json`**
```json
{
  "dependencies": {
    "@azure/storage-blob": "^12.17.0",
    "jsonwebtoken": "^9.0.2",
    "jwks-client": "^3.0.1"
  }
}
```

**Update `api/secure-download/index.js`** to validate Azure AD tokens instead of email headers:

```javascript
const { BlobServiceClient, StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters } = require('@azure/storage-blob');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-client');

const client = jwksClient({
  jwksUri: 'https://login.microsoftonline.com/YOUR_TENANT_ID/discovery/v2.0/keys'
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

module.exports = async function (context, req) {
    context.log('Secure download request received');
    
    try {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            context.res = {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
                },
                body: ''
            };
            return;
        }
        
        // Extract and verify JWT token
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            context.res = {
                status: 401,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { error: 'Authorization token required' }
            };
            return;
        }
        
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        // Verify JWT token
        const decoded = await new Promise((resolve, reject) => {
            jwt.verify(token, getKey, {
                audience: 'YOUR_CLIENT_ID', // Your App Registration Client ID
                issuer: 'https://login.microsoftonline.com/YOUR_TENANT_ID/v2.0',
                algorithms: ['RS256']
            }, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded);
            });
        });
        
        // Verify user is from UVA domain
        if (!decoded.preferred_username || !decoded.preferred_username.toLowerCase().endsWith('@virginia.edu')) {
            context.res = {
                status: 403,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { error: 'Access restricted to @virginia.edu accounts' }
            };
            return;
        }
        
        // Continue with existing blob storage logic...
        // [Rest of your existing Azure Function code for file download]
        
    } catch (error) {
        context.log.error('Token validation failed:', error);
        context.res = {
            status: 401,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: { error: 'Invalid or expired token' }
        };
    }
};
```

### Step 4: Update Download Function in Frontend

**Update the `handleSecureDownload` function** to send Azure AD token instead of email headers:

```javascript
async function handleSecureDownload(event) {
  const filename = event.target.dataset.filename;
  
  if (!currentAccount) {
    alert('Please sign in to download files.');
    return;
  }
  
  try {
    // Get access token from Azure AD
    const accessToken = await getAccessToken();
    
    const response = await fetch('/api/secure-download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}` // Send Azure AD token
      },
      body: JSON.stringify({ file: filename })
    });
    
    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Create download link
    const link = document.createElement('a');
    link.href = data.downloadUrl;
    link.download = filename.split('/').pop();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error('Download failed:', error);
    alert('Download failed: ' + error.message);
  }
}
```

### Step 5: Clean Up Old Code

**Remove these old functions/variables:**
- `checkAuth()`
- `sendVerificationCode()`
- `validateEmail()`
- `verifiedUserEmail` variable
- All localStorage-based email verification code

### Step 6: Group-Based Access Control (Optional)

**To restrict access to specific UVA groups:**

1. **In Azure AD**: Create a security group for APPExplorer users
2. **Add users** to this group who should have download access
3. **Update the loginRequest** to include group scopes:
```javascript
const loginRequest = {
  scopes: ["User.Read", "GroupMember.Read.All"]
};
```

4. **In Azure Function**: Add group validation:
```javascript
// Check if user is member of required group
const groupId = "12345678-1234-1234-1234-123456789012"; // Your group ID
const groupResponse = await fetch(`https://graph.microsoft.com/v1.0/me/memberOf`, {
  headers: { 'Authorization': `Bearer ${graphToken}` }
});
const groups = await groupResponse.json();
const hasAccess = groups.value.some(group => group.id === groupId);

if (!hasAccess) {
  return { status: 403, body: { error: 'Access denied - insufficient permissions' } };
}
```

## Testing the Integration

1. **Deploy updated code** to Azure Static Web Apps
2. **Test sign-in flow**: Should redirect to UVA login
3. **Test download**: Should work with proper authentication
4. **Test sign-out**: Should clear session properly

## Benefits of This Implementation

- ✅ **Real Authentication**: Uses actual UVA credentials
- ✅ **Group-Based Access**: Can restrict to specific groups/roles
- ✅ **Single Sign-On**: Works with existing UVA systems
- ✅ **Security**: JWT tokens with proper validation
- ✅ **Professional**: Standard enterprise authentication pattern

## Troubleshooting

### Common Issues:
1. **CORS Errors**: Ensure redirect URI matches exactly
2. **Token Validation**: Verify tenant ID and client ID are correct
3. **Permission Issues**: Ensure admin consent is granted for API permissions
4. **Group Access**: Verify users are in correct Azure AD groups

## Contact UVA IT
For Azure AD tenant information and group setup, you may need to coordinate with UVA IT Services to:
- Get the correct tenant ID
- Set up appropriate security groups
- Grant necessary permissions

---

*Last Updated: September 15, 2025*
*Status: Implementation in Progress*