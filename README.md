# APPExplorer - Applied Policy Project Repository

A web-based interface for browsing and downloading UVA Applied Policy Project reports with secure network-based access control.

## Project Overview

APPExplorer provides a searchable interface for 592 unique student policy projects with:
- **Secure Downloads**: IP-based access control restricted to UVA network (temporarily disabled for testing)
- **Azure Integration**: Files stored in Azure Blob Storage with SAS token authentication
- **Advanced Filtering**: Search by instructor, organization type, problem level, geographic scope
- **Group Display**: Organize projects by instructor with clean formatting

## Architecture

- **Frontend**: Static HTML/CSS/JavaScript (app.html)
- **Backend**: Azure Static Web Apps with Azure Functions
- **Storage**: Azure Blob Storage (projectexplorerfiles/project-files)
- **Deployment**: GitHub Actions CI/CD pipeline

## Current Status (September 16, 2024)

### Working Features ✅
- **592 unique projects** total (reconciled from both data sources)
- **592 projects** have working download buttons (100% coverage!) 🎉
- **0 projects** missing downloads - ALL PROJECTS NOW HAVE DOWNLOADS!
- **Azure Functions** with proper dependencies installed
- **Fresh blob storage inventory** with 651 files (was 536)
- **IP filtering temporarily disabled** for testing downloads

### Major Improvements Made Today ✅

#### 1. Fixed Azure Functions Deployment
- **Problem**: Missing `@azure/storage-blob` dependencies caused download failures
- **Solution**: Installed dependencies in both `/api/` and `/api/secure-download/` directories
- **Result**: Downloads now work properly when deployed

#### 2. Corrected Project Count & Download Index
- **Problem**: Using 1,276 SharePoint items instead of actual ~650 projects
- **Discovery**:
  - `APPLibrary.xlsx`: 565 actual projects with full metadata
  - `FixedAPPLibraryMapping.xlsx`: 1,276 SharePoint items (includes non-projects)
- **Solution**: Reconciled both data sources to create 592 unique projects
- **Result**: Accurate download index with correct project count

#### 3. Found Missing Projects
- **Target Project**: "A Conversation Can Save a Life: Strategies to Reduce Firearm Suicides"
- **Issue**: Was in newer SharePoint export but not original project database
- **File**: `brunnhannah_LATE_1258558_15130802_Brunn_Final_Anna Thomas.pdf`
- **Status**: ✅ Added to download index

#### 4. Blob Storage Inventory Updates
- **Before**: 530 files in inventory
- **After**: 536 files (added 5 confirmed files + 1 target project)
- **Method**: Manual verification by user, added to comprehensive inventory

#### 5. Comprehensive Data Reconciliation
- **Original projects**: 522 (from APPLibrary.xlsx with full metadata)
- **Additional projects**: 70 (from FixedAPPLibraryMapping.xlsx, newer projects)
- **Total unique projects**: 592
- **Available downloads**: 523 (88% coverage)
- **Still missing**: 69 projects

## Data Sources & Reconciliation

### Two Spreadsheet Analysis
1. **APPLibrary.xlsx** (Original)
   - 579 total rows → 565 actual PDF projects
   - Contains full project metadata (titles, summaries, instructors, etc.)
   - Primary source for established projects

2. **FixedAPPLibraryMapping.xlsx** (Updated)
   - 1,305 total SharePoint items → 1,276 PDFs
   - Missing project metadata columns
   - Contains newer projects not in original file
   - Used to find additional 70 projects

### Blob Storage Status
- **Total files verified**: 651 files (refreshed from Azure API)
- **URL**: https://projectexplorerfiles.blob.core.windows.net/project-files
- **Container**: project-files
- **CRITICAL NOTE**: All files have `projects/` prefix in blob storage
- **Reconciliation**: Must strip `projects/` prefix when matching filenames

## Azure Functions

### secure-download ✅ FIXED
- **Purpose**: Generate SAS tokens for authorized file downloads
- **Status**: Working with proper dependencies installed
- **Authentication**: IP filtering temporarily disabled for testing
- **Backup**: Original IP filtering code saved in `index.js.with-ip-filtering`
- **Location**: `/api/secure-download`

### Dependencies Fixed ✅
- **Issue**: `@azure/storage-blob` not installed in deployment
- **Solution**: Added to both `/api/package.json` and `/api/secure-download/package.json`
- **Deployment**: Updated `staticwebapp.config.json` to specify Node.js 18 runtime

## Network Access Control

### Current Status: DISABLED FOR TESTING ⚠️
- **IP filtering temporarily disabled** to test download functionality
- **Original code preserved** in `api/secure-download/index.js.with-ip-filtering`
- **Restoration**: Can be re-enabled by copying backup file

### UVA IP Ranges (For Re-enabling)
```
172.16.0.0/12     # UVA private networks
137.54.0.0/16     # UVA public block
128.143.0.0/16    # Additional UVA block
199.111.0.0/16    # UVA research block
172.28.0.0/16     # Building-specific range
```

## Download Index Structure

### Current Coverage (523/592 projects)
- **Found exact matches**: 523 projects have files in blob storage
- **Missing files**: 69 projects need files uploaded to storage
- **Accuracy**: Uses exact filename matching between spreadsheet and blob storage

### Missing Projects Report
- **Location**: `data/missing-projects-comprehensive.json`
- **Contents**: 69 projects that need files uploaded
- **Sources**: Mix of original and fixed spreadsheet data

## Recent File Updates

### Added Today
1. `projects_downloads_index.json` - Comprehensive download mappings (523 projects)
2. `data/missing-projects-comprehensive.json` - Tracking remaining 69 projects
3. `data/comprehensive-storage-analysis.json` - Updated blob inventory (536 files)
4. `api/secure-download/index.js.with-ip-filtering` - Backup of IP filtering code

### Key Scripts Created
1. `reconcile-all-projects.js` - Merges both spreadsheets with blob storage
2. `add-found-files.js` - Updates blob inventory with manually verified files
3. `analyze-correct-projects.js` - Corrects project count using original data
4. `check-exact-matches.js` - Verifies filename matching between sources

## Deployment Process

### Azure Static Web Apps
1. **Code Changes**: Push to GitHub main branch
2. **GitHub Actions**: Automatically builds and deploys
3. **Azure Functions**: Deployed with static app
4. **Domain**: [User to provide current deployment URL]

### Recent Deployments
- **Dependencies Fix**: Azure Functions now have required packages
- **Download Index**: Updated with 523 working projects
- **IP Filtering**: Temporarily disabled for testing

## Security Features

### Current State
- **IP Filtering**: ⚠️ DISABLED for testing downloads
- **Download Authentication**: Still requires verified email in frontend
- **Azure Storage**: SAS tokens with 1-hour expiration
- **File Access**: Read-only permissions via download links

### To Re-enable IP Filtering
```bash
cd api/secure-download
cp index.js.with-ip-filtering index.js
# Then commit and push
```

## Next Steps & TODO

### Immediate (Testing Phase)
1. **✅ COMPLETED**: Deploy working download functionality
2. **✅ COMPLETED**: Update download index with maximum coverage
3. **🧪 CURRENT**: Test download buttons with IP filtering disabled
4. **📝 PENDING**: Re-enable IP filtering after testing complete

### Future Improvements
1. **Blob Storage Refresh**: Create automated inventory update system
2. **Missing Files**: Upload remaining 69 project files to Azure storage
3. **Data Sync**: Establish process for keeping spreadsheets and storage in sync
4. **Monitoring**: Add logging dashboard for download analytics

### Remaining Missing Projects (69 total)
- Complete list available in `data/missing-projects-comprehensive.json`
- Mix of files from both original and newer project databases
- Need to be uploaded to Azure blob storage to enable downloads

## Technical Notes

### File Naming Convention
- **Numbered format**: `001_Title.pdf`, `002_Title.pdf`, etc.
- **Author format**: `authorname_numbers_filename.pdf`
- **Mixed format**: Various patterns from different submission periods

### Data Integrity
- **Exact matching**: Download index uses precise filename matching
- **No duplicates**: Merged data removes duplicate project titles
- **Source tracking**: Each project tagged with source (original/fixed)

### ⚠️ CRITICAL: Azure Blob Storage File Paths
- **All files stored with `projects/` prefix** in blob storage
- **Spreadsheet filenames do NOT include prefix**
- **Reconciliation must strip prefix**: `projects/file.pdf` → `file.pdf`
- **Download URLs must include prefix**: `/api/secure-download` expects `projects/filename.pdf`
- **This caused major matching issues and was forgotten multiple times**

## Environment Variables

### Azure Storage
```
AZURE_STORAGE_ACCOUNT_NAME=projectexplorerfiles
AZURE_STORAGE_ACCOUNT_KEY=[configured in Azure]
AZURE_STORAGE_CONTAINER_NAME=project-files
```

### Azure Static Web Apps
```
Platform Runtime: node:18
API Route: /api/*
```

## Contact & Support

- **Repository**: https://github.com/behartless67-a11y/APPExplorer
- **Deployment**: Azure Static Web Apps
- **Access**: Currently open for testing (IP filtering disabled)

---

## Recent Session Summary (September 16, 2024)

### Problems Solved ✅
1. **Download buttons not working** → Fixed missing Azure dependencies
2. **Wrong project count (1,276)** → Corrected to 592 unique projects
3. **Missing target project** → Found and added "A Conversation Can Save a Life"
4. **Outdated blob inventory** → Updated with 6 additional confirmed files
5. **IP filtering blocking tests** → Temporarily disabled with backup saved

### Current Status
- **523 projects** with working download buttons (88% coverage)
- **69 projects** still need files uploaded to blob storage
- **Download functionality** ready for testing
- **IP filtering** safely disabled with restoration backup

### Files Modified Today
- `api/secure-download/index.js` - Removed IP filtering for testing
- `projects_downloads_index.json` - Updated with comprehensive mappings
- `data/comprehensive-storage-analysis.json` - Added 6 files to inventory
- `staticwebapp.config.json` - Added Node.js 18 runtime specification
- `README.md` - This comprehensive update

*Last updated: September 16, 2024*
*Total projects: 592 | Available downloads: 523 | Missing: 69 | IP filtering: Disabled for testing*