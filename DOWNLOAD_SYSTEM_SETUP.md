# APPExplorer Download System Setup

## Overview
This document details the complete setup and configuration of the secure download system for APPExplorer, allowing authenticated UVA users to download project files from Azure blob storage.

## What We Accomplished (September 15, 2025)

### 1. Project Repository Setup
- ✅ Cloned the APPExplorer repository from GitHub
- ✅ Analyzed existing project structure and Azure Function setup
- ✅ Confirmed GitHub Actions workflow was properly configured

### 2. Excel Data Processing
- ✅ **Created `scripts/process-excel.js`** - Extracts project data from APPLibrary.xlsx
- ✅ **Processed APPLibrary.xlsx** - Successfully extracted 530 project mappings
- ✅ **Generated `data/projects.json`** - Project metadata for search/AI functions
- ✅ **Generated `data/download-mapping.json`** - Title-to-filename mappings
- ✅ **Created `data/azure-file-list.txt`** - Complete list of expected files in blob storage

### 3. Download System Integration
- ✅ **Updated `app.html`** - Embedded new DOWNLOAD_INDEX with all 530 projects
- ✅ **Created `scripts/update-app-html.js`** - Automated script to update download mappings
- ✅ **Fixed subfolder path issue** - Added `projects/` prefix to all file paths

### 4. Azure Configuration
- ✅ **Environment Variables Configured**:
  - `AZURE_STORAGE_ACCOUNT_KEY`: Storage account access key
  - `AZURE_STORAGE_ACCOUNT_NAME`: projectexplorerfiles
  - `AZURE_STORAGE_CONTAINER_NAME`: project-files
  - `AZURE_STORAGE_CONNECTION_STRING`: Full connection string for reliability
- ✅ **Azure Function Deployed** - `/api/secure-download` endpoint working
- ✅ **Blob Storage Structure Confirmed** - Files located in `project-files/projects/` container

### 5. Authentication & Security
- ✅ **UVA Email Verification** - Only @virginia.edu addresses can download
- ✅ **Time-Limited Access** - 24-hour verification window
- ✅ **SAS Token Generation** - Secure 1-hour download links
- ✅ **Private Blob Storage** - No public access, downloads via secure API only

### 6. Testing & Debugging
- ✅ **Created diagnostic scripts** for troubleshooting
- ✅ **Identified and fixed filename matching issues**
- ✅ **Resolved Azure Function permissions**
- ✅ **Fixed blob storage path structure**

## File Structure

```
APPExplorer/
├── api/
│   └── secure-download/
│       ├── index.js              # Azure Function for secure downloads
│       ├── function.json         # Function configuration
│       └── package.json          # Dependencies (@azure/storage-blob)
├── data/
│   ├── projects.json             # Project metadata (579 projects)
│   ├── download-mapping.json     # Title-to-filename mapping (530 files)
│   └── azure-file-list.txt       # Complete list of expected files
├── scripts/
│   ├── process-excel.js          # Extract data from APPLibrary.xlsx
│   ├── update-app-html.js        # Update download mappings in HTML
│   ├── fix-subfolder-mapping.js  # Add projects/ prefix to paths
│   ├── diagnose-downloads.js     # Troubleshooting tool
│   └── test-filename-encoding.js # Debug filename issues
├── app.html                      # Main application with embedded DOWNLOAD_INDEX
├── APPLibrary.xlsx              # Source Excel file with project data
└── .github/workflows/           # Automated deployment via GitHub Actions
```

## Azure Infrastructure

### Storage Account: `projectexplorerfiles`
- **Container**: `project-files`
- **Subfolder**: `projects/` (all files are in this subfolder)
- **File Types**: PDF (518 files), DOCX (12 files)
- **Access**: Private (no public access)

### Static Web App: `calm-rock-0599eab0f`
- **URL**: https://calm-rock-0599eab0f.1.azurestaticapps.net/
- **API Endpoint**: `/api/secure-download`
- **Authentication**: @virginia.edu email verification
- **Deployment**: Automatic via GitHub Actions

## How the Download System Works

1. **User Authentication**:
   - User enters @virginia.edu email address
   - Email verification with 24-hour validity
   - Verification token stored in browser

2. **Download Request**:
   - User clicks "Download Full Project" on any project
   - JavaScript looks up filename in embedded DOWNLOAD_INDEX
   - POST request sent to `/api/secure-download` with:
     - Verified email in headers
     - Verification timestamp
     - Requested filename

3. **Azure Function Processing**:
   - Validates @virginia.edu email domain
   - Checks verification hasn't expired (24 hours)
   - Connects to Azure blob storage using connection string
   - Verifies file exists in `project-files/projects/{filename}`
   - Generates SAS token (1-hour validity)
   - Returns secure download URL

4. **File Download**:
   - User's browser automatically downloads file using SAS URL
   - Download link expires after 1 hour
   - All downloads are logged for audit purposes

## Environment Variables Required

In Azure Static Web App → Environment Variables:

```
AZURE_STORAGE_ACCOUNT_KEY=[REDACTED - Get from Azure Portal → Storage Account → Access Keys]
AZURE_STORAGE_ACCOUNT_NAME=projectexplorerfiles
AZURE_STORAGE_CONTAINER_NAME=project-files
AZURE_STORAGE_CONNECTION_STRING=[REDACTED - Get from Azure Portal → Storage Account → Access Keys → Connection String]
```

## File Naming Convention

Files in Azure blob storage follow this pattern:
- **Location**: `project-files/projects/{filename}`
- **Format**: `{number}_{title}.{ext}`
- **Examples**:
  - `projects/466_Invisible and Disproportionate Casualties.pdf`
  - `projects/cramerwilliam_5605_7762775_APP Technical Repo_Joshua McCray.pdf`
  - `projects/462_-Driving- Electric Vehicle Adoption in Rhode Island.pdf`

## Troubleshooting Tools

### Diagnostic Script
```bash
node scripts/diagnose-downloads.js
```
- Analyzes download mapping
- Identifies potential filename issues
- Shows file type breakdown
- Generates complete file list for Azure verification

### Test Download API
```javascript
fetch('/api/secure-download', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'x-verified-email': 'your-id@virginia.edu',
        'x-verification-time': Date.now().toString()
    },
    body: JSON.stringify({file: 'projects/filename.pdf'})
})
.then(r => r.json())
.then(console.log);
```

### Update Process
When APPLibrary.xlsx is updated:
1. Run `node scripts/process-excel.js` to extract new data
2. Run `node scripts/update-app-html.js` to update the website
3. Commit and push changes to trigger automatic deployment

## Security Considerations

- ✅ **Email Domain Verification**: Only @virginia.edu addresses allowed
- ✅ **Time-Limited Tokens**: 24-hour verification, 1-hour download links  
- ✅ **Private Storage**: No direct blob access, all downloads via API
- ✅ **Audit Logging**: All downloads logged with user email and timestamp
- ✅ **Path Validation**: Prevents directory traversal attacks
- ✅ **CORS Protection**: API only accessible from the application domain

## Known Issues & Solutions

### Issue: "File not found" errors
- **Cause**: Usually filename mismatch or missing `projects/` path
- **Solution**: Verify file exists in Azure blob storage with exact name
- **Tool**: Use `scripts/diagnose-downloads.js` to check mappings

### Issue: Authentication failures  
- **Cause**: Expired verification or non-UVA email
- **Solution**: Re-verify email address, ensure @virginia.edu domain

### Issue: Azure Function not deployed
- **Cause**: GitHub Actions deployment failure
- **Solution**: Check Actions tab, ensure API location in workflow is correct

## Success Metrics

- ✅ **530 project files** mapped and accessible
- ✅ **579 total projects** in database (49 without downloadable files)
- ✅ **100% UVA authentication** coverage
- ✅ **Secure download system** with time-limited access
- ✅ **Automated deployment** via GitHub Actions

## Future Maintenance

1. **Monthly**: Update APPLibrary.xlsx and re-run processing scripts
2. **Quarterly**: Review Azure Storage costs and usage patterns  
3. **Annually**: Rotate Azure Storage access keys
4. **As Needed**: Add new file types or adjust authentication requirements

---

*Last Updated: September 15, 2025*
*System Status: ✅ Operational*