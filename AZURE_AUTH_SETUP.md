# Azure Authentication Setup for APPExplorer

This document provides step-by-step instructions for configuring Azure/Entra ID authentication for APPExplorer using Azure Static Web Apps built-in authentication.

## Prerequisites

- Azure subscription with admin access
- UVA Azure tenant access
- Access to create Azure app registrations
- Azure Static Web Apps deployment

## Step 1: Create Azure App Registration

1. Go to Azure Portal → Azure Active Directory → App registrations
2. Click "New registration"
3. Configure:
   - **Name**: `APPExplorer-Production`
   - **Supported account types**: `Accounts in this organizational directory only (UVA only - Single tenant)`
   - **Redirect URI**:
     - Platform: `Web`
     - URI: `https://YOUR_STATIC_WEB_APP_URL/.auth/login/aad/callback`

4. Click "Register"

## Step 2: Configure App Registration

### Authentication Settings
1. Go to Authentication in your app registration
2. Add additional redirect URIs if needed:
   - `https://YOUR_STATIC_WEB_APP_URL/.auth/login/aad/callback`
   - `https://YOUR_CUSTOM_DOMAIN/.auth/login/aad/callback` (if using custom domain)

3. Configure advanced settings:
   - **Access tokens**: ✅ Checked
   - **ID tokens**: ✅ Checked

### Token Configuration
1. Go to Token configuration
2. Add optional claims:
   - **ID tokens**: `groups`, `email`, `given_name`, `family_name`
   - **Access tokens**: `groups`, `email`

### API Permissions
1. Go to API permissions
2. Ensure these permissions are granted:
   - `User.Read` (should be default)
   - `GroupMember.Read.All` (for group membership)

3. Grant admin consent for the organization

## Step 3: Configure Group Claims

1. In Token configuration → Add groups claim
2. Select:
   - **Security groups**: ✅
   - **Distribution lists**: ✅
   - **Directory roles**: ✅
3. For ID tokens, select: `Group ID`
4. For Access tokens, select: `Group ID`

## Step 4: Get Required Information

Note down these values from your app registration:
- **Application (client) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- **Directory (tenant) ID**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

## Step 5: Configure Entra Groups

Ensure these groups exist in your Azure tenant:
- `FBS_StaffAll`: For Batten School staff members
- `FBS_Community`: For Batten School community members

Add appropriate users to these groups.

## Step 6: Configure Azure Static Web Apps

### Environment Variables
In your Azure Static Web Apps configuration, add these application settings:

```
AZURE_CLIENT_ID=<your-app-registration-client-id>
AZURE_CLIENT_SECRET=<your-app-registration-client-secret>
```

### Create Client Secret
1. In your app registration, go to Certificates & secrets
2. Click "New client secret"
3. Description: `APPExplorer Static Web Apps`
4. Expires: `24 months` (recommended)
5. Copy the secret value immediately (you won't see it again)

### Update staticwebapp.config.json
Update the tenant ID in `staticwebapp.config.json`:

```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/YOUR_UVA_TENANT_ID/v2.0",
          "clientIdSettingName": "AZURE_CLIENT_ID",
          "clientSecretSettingName": "AZURE_CLIENT_SECRET"
        }
      }
    }
  }
}
```

Replace `YOUR_UVA_TENANT_ID` with your actual UVA tenant ID.

## Step 7: Deploy and Test

1. Commit and push your changes to trigger Azure Static Web Apps deployment
2. Test the authentication flow:
   - Visit your app
   - Click "Login" - should redirect to UVA login
   - Login with UVA credentials
   - Verify you see "Welcome, [username]" message
   - Test download functionality

## Step 8: Verify Group Membership

1. Check the browser console for authentication details
2. Use the `/api/getRoles` endpoint to verify group membership
3. Test that only users in `FBS_StaffAll` or `FBS_Community` can download files

## Troubleshooting

### Common Issues

1. **"AADSTS50011: The reply URL specified in the request does not match..."**
   - Verify redirect URI in app registration matches exactly
   - Check for trailing slashes

2. **"Groups not appearing in token"**
   - Verify group claims are configured in Token configuration
   - Check API permissions include `GroupMember.Read.All`
   - Ensure admin consent is granted

3. **"Authentication works but downloads fail"**
   - Check that user is member of required groups
   - Verify `secure-download` API function is receiving authentication headers
   - Check Azure Functions logs

### Testing Commands

Test authentication status:
```bash
curl https://YOUR_APP_URL/.auth/me
```

Test role assignment:
```bash
curl https://YOUR_APP_URL/api/getRoles
```

## Current Configuration

- **Authentication Provider**: Azure Active Directory (Entra ID)
- **Required Groups**: `FBS_StaffAll`, `FBS_Community`
- **Backup System**: All working code saved to `working-downloads-backup` branch
- **Download Coverage**: 592/592 projects (100%)

## Security Notes

- Authentication is enforced at the Azure Static Web Apps level
- Download API requires valid authentication token
- Group membership verified server-side
- No sensitive data stored in frontend
- Secure token handling via Azure platform

## Support

For issues with Azure configuration, contact UVA IT Services.
For application-specific issues, refer to the main README.md file.