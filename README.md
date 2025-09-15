# APPExplorer - Applied Policy Project Repository

A web-based interface for browsing and downloading UVA Applied Policy Project reports with secure network-based access control.

## Project Overview

APPExplorer provides a searchable interface for 651+ student policy projects with:
- **Secure Downloads**: IP-based access control restricted to UVA network
- **Azure Integration**: Files stored in Azure Blob Storage with SAS token authentication
- **Advanced Filtering**: Search by instructor, organization type, problem level, geographic scope
- **Group Display**: Organize projects by instructor with clean formatting

## Architecture

- **Frontend**: Static HTML/CSS/JavaScript (app.html)
- **Backend**: Azure Static Web Apps with Azure Functions
- **Storage**: Azure Blob Storage (projectexplorerfiles/project-files)
- **Deployment**: GitHub Actions CI/CD pipeline

## Current Status (September 2024)

### Working Features ✅
- **651 projects** loaded in system from APPLibrary.xlsx
- **530 projects** have working download buttons
- **UVA network IP validation** (172.16.0.0/12, 137.54.0.0/16, etc.)
- **PIN protection** (000235) for Submit Project feature
- **VPN instructions** for off-campus access
- **Enhanced error handling** and logging

### File Inventory Discovery 🔍
- **651 total blobs** confirmed in Azure Storage (via list-all-blobs function)
- **530 files** currently mapped to project downloads
- **121 unmapped files** exist in storage but not linked to projects
- **78 projects** missing download buttons entirely

## File Inventory Analysis

### Confirmed Totals
- **Total projects in system**: 651
- **Total files in Azure storage**: 651 (verified via Azure Function)
- **Projects with downloads**: 530  
- **Files currently mapped**: 530
- **Unmapped files in storage**: 121
- **Projects missing downloads**: 78

### File Patterns in Azure Storage
- **Numbered files (001_)**: 473 files mapped
- **Author-named files**: 38 files mapped  
- **Simple name files**: 13 files mapped
- **Other formats**: 6 files mapped
- **Unmapped files**: 121 files (location verified but content unknown)

### Key Discovery
The **121 unmapped files** in Azure Storage likely contain many of the **78 missing projects**. Need to check first pages of unmapped files to match with missing project titles.

## Azure Functions

### secure-download
- **Purpose**: Generate SAS tokens for authorized file downloads
- **Authentication**: UVA network IP validation
- **Location**: `/api/secure-download`

### test-storage  
- **Purpose**: Test Azure Storage connectivity
- **Location**: `/api/test-storage`

### list-all-blobs ✅
- **Purpose**: Complete inventory of all Azure Storage files
- **Features**: Pagination support, file categorization
- **Location**: `/api/list-all-blobs`
- **Status**: Working - confirmed 651 total blobs

## Network Access Control

### UVA IP Ranges
```
172.16.0.0/12     # UVA private networks
137.54.0.0/16     # UVA public block  
128.143.0.0/16    # Additional UVA block
199.111.0.0/16    # UVA research block
172.28.0.0/16     # Building-specific range
```

### VPN Access
- Off-campus users must use UVA VPN
- Instructions: https://virginia.service-now.com/its?id=itsweb_kb_article&sys_id=f24e5cdfdb3acb804f32fb671d9619d0

## Data Sources

### APPLibrary.xlsx Processing
- **Original source**: Excel file with 579 project entries  
- **Unique projects**: 530 (49 duplicates removed)
- **File mappings**: Generated from filename columns
- **Output**: `data/download-mapping.json`

### Project Database
- **Location**: Embedded in app.html as DATA constant
- **Format**: JSON with projects array
- **Fields**: title, summary, instructor, client_org_type, problem_level, geographic_scope

## Deployment Process

1. **Code Changes**: Push to GitHub main branch
2. **GitHub Actions**: Automatically builds and deploys
3. **Azure Static Web Apps**: Serves frontend and Azure Functions
4. **Domain**: https://calm-rock-0599eab0f.1.azurestaticapps.net

## Security Features

### PIN Protection
- **Submit Project**: Protected with PIN 000235
- **Implementation**: JavaScript prompt validation

### IP-Based Access Control
- **Method**: CIDR range validation against UVA networks
- **Fallback**: Localhost allowed for development
- **Error Handling**: Graceful degradation with user messaging

### Azure Storage Security
- **SAS Tokens**: 1-hour expiration on download URLs
- **Read-Only Access**: No write permissions via download links
- **Network Isolation**: Combined with IP validation

## Missing Projects Analysis

### Projects Without Downloads (78 total)
**By Instructor:**
- Anna Rorem: 16 missing
- Andrew Pennock: 14 missing  
- Benjamin Castleman: 13 missing
- Sebastian Tello Trillo: 12 missing
- Alexander Bick: 11 missing
- Noah Myung: 6 missing
- Craig Volden: 3 missing
- Jeanine Braithwaite: 2 missing
- Lucy Bassett: 1 missing

### Recovery Strategy
1. **File Matching**: Check 121 unmapped Azure files against missing project titles
2. **First Page Verification**: Download unmapped files and check actual project titles
3. **Instructor Outreach**: Contact faculty with remaining missing projects
4. **Administrative Archives**: Check Canvas/LMS, email attachments for any still missing

## File Discovery Investigation

### Current Status: BREAKTHROUGH ✅
- **651 total blobs** confirmed in Azure Storage (exact match to project count)
- **530 files** mapped to downloads
- **121 files** unmapped but exist in storage
- High probability that **most of the 78 missing projects** are in these 121 unmapped files

### Investigation Tools
- `list-all-blobs` Azure Function - ✅ Working, shows complete inventory
- File pattern analysis scripts
- First-page title verification for unmapped files

## Development History

### Major Changes (September 2024)
1. **Replaced email verification** with IP-based authentication
2. **Fixed HTTP 500 errors** by resolving undefined variable references
3. **Added PIN protection** for Submit Project feature
4. **Enhanced error logging** for Azure Storage debugging
5. **Created comprehensive file analysis** tools
6. **Implemented VPN user guidance** system
7. **Discovered 121 unmapped files** via list-all-blobs function

### Breakthrough Discovery
- Found that Azure Storage contains **exactly 651 files** (matching project count)
- Confirmed **121 unmapped files** exist and likely contain missing projects
- Next phase: Match unmapped files to missing project titles

## Key Files

### Core Application
- `app.html` - Main application (1900+ lines)
- `data/download-mapping.json` - Project to file mappings (530 entries)

### Azure Functions
- `api/secure-download/` - Main download authentication
- `api/test-storage/` - Storage connectivity testing  
- `api/list-all-blobs/` - Complete storage inventory ✅ Working

### Analysis Scripts
- `check-numbered-files.js` - Verify file title mappings
- `verify-numbered-file-titles.js` - Title verification strategy
- `analyze-missing.js` - Missing project analysis

### Data Files
- `data/azure-file-list.txt` - Known Azure storage files (530)
- `data/projects.json` - All project metadata
- `APPLibrary.xlsx` - Original source data

## Environment Variables

### Azure Storage
```
AZURE_STORAGE_ACCOUNT_NAME=projectexplorerfiles
AZURE_STORAGE_ACCOUNT_KEY=[configured in Azure]
AZURE_STORAGE_CONTAINER_NAME=project-files
```

## Next Steps (HIGH PRIORITY)

### FOR TOMORROW: UNMAPPED FILE RECOVERY 🎯

1. **✅ COMPLETED**: Verify total blob count (651 confirmed)
2. **📋 TOMORROW**: Use `/api/list-all-blobs` to get complete list of 121 unmapped files
3. **📄 TOMORROW**: Download sample unmapped files and check first page titles
4. **🔗 TOMORROW**: Match unmapped files to missing project titles by content verification
5. **📝 TOMORROW**: Add successful matches to download-mapping.json
6. **📊 GOAL**: Recover most of the 78 missing project downloads from existing Azure storage
7. **👥 FALLBACK**: Contact instructors for any remaining unmapped files

### NOTE FOR TOMORROW:
**BREAKTHROUGH**: Found 651 total files in Azure Storage (exact match to project count)
- 530 files are mapped to downloads ✅
- **121 files exist but are unmapped** 🔍
- These 121 likely contain most of the 78 missing projects
- Use list-all-blobs Azure Function to get the complete unmapped file list
- Check first page of unmapped files to match project titles

## Contact & Support

- **Repository**: https://github.com/behartless67-a11y/APPExplorer
- **Deployment**: Azure Static Web Apps
- **Access**: UVA network or VPN required for downloads

---

*Last updated: September 15, 2024*
*Total projects: 651 | Files in storage: 651 | Working downloads: 530 | Unmapped files: 121*
