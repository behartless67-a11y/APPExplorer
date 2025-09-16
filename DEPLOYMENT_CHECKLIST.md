# Azure Static Web App Deployment Checklist

## Pre-Deployment Requirements
- [ ] Azure Storage Account configured with connection string
- [ ] Environment variables set in Azure Static Web App settings
- [ ] All API dependencies installed

## Files to Deploy
- [ ] `/api/` directory with all functions
- [ ] `/api/package.json` with dependencies
- [ ] `/api/node_modules/` (or let Azure install dependencies)
- [ ] `staticwebapp.config.json` configuration
- [ ] Main app files (`index.html`, `app.html`, etc.)

## Environment Variables Needed in Azure Portal
```
AZURE_STORAGE_ACCOUNT_NAME=projectexplorerfiles
AZURE_STORAGE_ACCOUNT_KEY=[your-storage-account-key]
AZURE_STORAGE_CONTAINER_NAME=project-files
```

## Testing Download Function
Test the secure download endpoint:
```bash
curl -X POST https://your-app.azurestaticapps.net/api/secure-download \
  -H "Content-Type: application/json" \
  -d '{"file":"test-file.pdf"}'
```

## Troubleshooting
1. Check Azure Functions logs in the portal
2. Verify storage account access keys
3. Ensure all npm dependencies are installed
4. Verify staticwebapp.config.json routes configuration