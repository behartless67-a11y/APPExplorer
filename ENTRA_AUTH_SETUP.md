# Entra ID Authentication Setup Documentation

## Current Status
✅ **Brand Updates Deployed** - All UI improvements are live
✅ **IP-Based Filtering Active** - Downloads restricted to UVA network
⏳ **Entra Authentication Pending** - Waiting for Client Secret from admin

---

## What We've Completed

### 1. Brand Styling Updates (Deployed ✅)
- Switched typography from Playfair Display to **Crimson Text** for brand consistency
- Updated all buttons with **UVA Orange (#E57200)** accent colors
- Increased container width from 1400px to **1800px** for better background coverage
- Added **rounded top corners (24px)** to app wrapper for elevated card appearance
- Adjusted background opacity to **50%** to show Rotunda image more prominently
- Added **Card/List view toggle**:
  - Card view: Full cards with truncated summaries
  - List view: Compact items with full summary text and download buttons
- Simplified header with left-aligned Batten logo and 3px orange bottom border
- Added body padding (40px top, 20px sides) to show background

### 2. Current Authentication Setup
- **Download Authentication**: IP-based filtering (UVA network: 137.54.0.0/16 and other ranges)
- **Site Access**: Anonymous (no login required to view projects)
- **API Endpoints**:
  - `/api/secure-download` - Requires UVA network IP
  - Other API endpoints - Anonymous access

---

## Entra ID Configuration (In Progress)

### Admin Setup Complete ✅
Your admin has created the following:

**Entra App Registration: "hoowroteit"**
- **Client ID**: `0b45a06e-6b4a-4c3e-80ff-01d0c11a9def`
- **Tenant ID**: `7b3480c7-3707-4873-8b77-e216733a65ac`
- **Directory (tenant) ID**: `7b3480c7-3707-4873-8b77-e216733a65ac`
- **Supported account types**: My organization only

**Security Group: "FBS_Community"**
- **Object ID**: `b747678a-05a5-4965-bf23-436edec61fa4`
- **Type**: Security
- **Source**: Windows Server AD
- **Membership type**: Assigned

### What We Still Need from Admin ⏳

#### 1. Client Secret (REQUIRED)
The admin needs to generate a Client Secret from the Entra app registration:

**Steps for Admin:**
1. Go to Azure Portal → **Microsoft Entra ID**
2. Click **App registrations** → Find **"hoowroteit"**
3. Go to **Certificates & secrets**
4. Click **+ New client secret**
5. Add description: "APPExplorer Static Web App Production"
6. Choose expiration: 24 months (recommended)
7. Click **Add**
8. **IMPORTANT**: Copy the secret **Value** immediately (shown only once!)
9. Provide this value securely to the team

#### 2. Redirect URIs (REQUIRED)
The admin needs to add these redirect URIs to the app registration:

**Steps for Admin:**
1. In the **"hoowroteit"** app registration
2. Go to **Authentication**
3. Click **+ Add a platform** → **Web**
4. Add these Redirect URIs:
   - `https://appexplorer.thebattenspace.org/.auth/login/aad/callback`
   - `https://calm-rock-0599eab0f.1.azurestaticapps.net/.auth/login/aad/callback`
5. Under "Implicit grant and hybrid flows", check:
   - ✅ ID tokens
6. Click **Save**

#### 3. API Permissions (Recommended)
Ensure the app has the following permissions:

**Steps for Admin:**
1. In the **"hoowroteit"** app registration
2. Go to **API permissions**
3. Verify these permissions exist (add if missing):
   - **Microsoft Graph** → `User.Read` (Delegated)
   - **Microsoft Graph** → `GroupMember.Read.All` (Delegated)
4. Click **Grant admin consent** for your organization

#### 4. Group Membership Configuration
Verify users are assigned to the security group:

**Steps for Admin:**
1. Go to **Microsoft Entra ID** → **Groups**
2. Find **"FBS_Community"** group
3. Click **Members**
4. Add users who should have access to the application
5. Verify your test account is in the group

---

## Implementation Steps (When Ready)

Once we receive the Client Secret from the admin, here's what we'll do:

### Step 1: Add Environment Variables to Azure Static Web App
1. Go to Azure Portal → **APPExplorerNew** Static Web App
2. Navigate to **Settings** → **Environment variables**
3. Select **Production** environment
4. Add the following variables:
   - **Name**: `AZURE_CLIENT_ID`
     **Value**: `0b45a06e-6b4a-4c3e-80ff-01d0c11a9def`
   - **Name**: `AZURE_CLIENT_SECRET`
     **Value**: `[SECRET VALUE FROM ADMIN]`
5. Click **Save**

### Step 2: Update staticwebapp.config.json
Already configured with:
```json
{
  "auth": {
    "identityProviders": {
      "azureActiveDirectory": {
        "registration": {
          "openIdIssuer": "https://login.microsoftonline.com/7b3480c7-3707-4873-8b77-e216733a65ac/v2.0",
          "clientIdSettingName": "AZURE_CLIENT_ID",
          "clientSecretSettingName": "AZURE_CLIENT_SECRET"
        }
      }
    }
  },
  "routes": [
    {
      "route": "/api/secure-download",
      "allowedRoles": ["FBS_StaffAll", "FBS_Community"]
    },
    {
      "route": "/*",
      "allowedRoles": ["anonymous"]  // Will change to ["authenticated"]
    }
  ]
}
```

### Step 3: Update API Function (api/secure-download/index.js)
We'll replace IP filtering with Entra group checking:

**Current (IP-based)**:
- Checks if client IP is in UVA network ranges
- Allows download if IP matches

**Future (Entra-based)**:
- Reads `x-ms-client-principal` header from Azure Static Web Apps
- Decodes user claims
- Verifies user is in "FBS_Community" or "FBS_StaffAll" group
- Allows download if user is authenticated and in correct group

### Step 4: Choose Authentication Scope
We need to decide:

**Option A: Authenticate Entire Site** (Recommended)
- Change `"route": "/*"` to `"allowedRoles": ["authenticated"]`
- Users must log in to view any page
- More secure, better user tracking

**Option B: Authenticate Downloads Only**
- Keep `"route": "/*"` as `"allowedRoles": ["anonymous"]`
- Only downloads require authentication
- Site remains publicly viewable

### Step 5: Testing Plan
1. Deploy changes to production
2. Test authentication flow:
   - Navigate to site
   - Click login (should redirect to Microsoft login)
   - Login with UVA credentials
   - Verify group membership is checked
   - Test download functionality
3. Test unauthorized access:
   - Use account NOT in FBS_Community group
   - Verify download is blocked with appropriate error

---

## Files Modified for Brand Updates

### app.html (263 lines changed)
**CSS Changes:**
- Lines 28-49: Added `#app-wrapper` styling with rounded corners
- Lines 72-81: Added list view and view toggle styles
- Lines 86-92: Updated button styling with UVA Orange
- Line 32: Changed background opacity from 0.88 to 0.5
- Line 41: Added orange bottom border to header
- Lines 55-59: Changed font from Playfair Display to Crimson Text
- Line 61: Increased container max-width to 1800px

**HTML Changes:**
- Lines 236-247: Wrapped content in `#app-wrapper` div
- Lines 229-231: Simplified header with single Batten logo
- Lines 288-293: Added Card/List view toggle buttons

**JavaScript Changes:**
- Line 490: Added `viewMode: "cards"` to state object
- Lines 709-724: Added `listItem()` function for list view rendering
- Lines 745-756: Added view mode logic in render function
- Lines 859-873: Added view toggle event listeners
- Line 1798: Updated selector to include `.list-item` for download buttons

### staticwebapp.config.json
Currently configured for Entra but temporarily set to `"anonymous"` access.

### api/secure-download/index.js
Currently using IP-based filtering. Will be updated to use Entra groups once Client Secret is configured.

---

## Repository Information

**GitHub Repository**: https://github.com/behartless67-a11y/APPExplorer
**Main Branch**: `main`
**Azure Static Web App**: APPExplorerNew
**Production URL**: https://appexplorer.thebattenspace.org/
**Azure URL**: https://calm-rock-0599eab0f.1.azurestaticapps.net/

---

## Contact for Next Steps

**What Admin Needs to Provide:**
1. ✅ Client Secret value from "hoowroteit" app registration
2. ✅ Confirmation that redirect URIs are configured
3. ✅ Confirmation that API permissions are granted
4. ✅ Confirmation that test users are added to FBS_Community group

**Once Received:**
- Development team will add Client Secret to Azure environment variables
- Update code to use Entra authentication
- Test and deploy to production
- Monitor for any authentication issues

---

## Rollback Plan

If Entra authentication causes issues, we can quickly rollback:

1. Change `staticwebapp.config.json`:
   ```json
   {
     "route": "/*",
     "allowedRoles": ["anonymous"]
   }
   ```

2. Revert `api/secure-download/index.js` to IP-based filtering

3. Git commit and push:
   ```bash
   git add .
   git commit -m "Rollback to IP-based authentication"
   git push
   ```

Deployment takes ~1-2 minutes to restore IP-based access.

---

## Additional Notes

- **Token Expiration**: Client Secret will expire based on admin's chosen period (recommend 24 months)
- **Group Sync**: FBS_Community is synced from Windows Server AD
- **Future Groups**: Can add more groups to `allowedRoles` array as needed
- **Monitoring**: Check Azure Application Insights for authentication logs
- **Cost**: Azure Static Web Apps authentication is included in the Free tier

---

*Last Updated: 2025-09-30*
*Status: Awaiting Client Secret from Admin*
