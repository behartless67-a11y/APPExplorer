/**
 * Update the app.html file with the new download mapping from the Excel file
 */
const fs = require('fs');
const path = require('path');

const APP_HTML_FILE = path.resolve('app.html');
const DOWNLOAD_MAPPING_FILE = path.resolve('data/download-mapping.json');

function main() {
  try {
    console.log('Reading download mapping from:', DOWNLOAD_MAPPING_FILE);
    
    if (!fs.existsSync(DOWNLOAD_MAPPING_FILE)) {
      console.error('Download mapping file not found:', DOWNLOAD_MAPPING_FILE);
      process.exit(1);
    }
    
    if (!fs.existsSync(APP_HTML_FILE)) {
      console.error('App HTML file not found:', APP_HTML_FILE);
      process.exit(1);
    }

    // Read the download mapping
    const downloadMapping = JSON.parse(fs.readFileSync(DOWNLOAD_MAPPING_FILE, 'utf8'));
    console.log(`Loaded ${Object.keys(downloadMapping).length} download mappings`);

    // Read the app.html file
    let appHtmlContent = fs.readFileSync(APP_HTML_FILE, 'utf8');
    
    // Find the DOWNLOAD_INDEX line and replace it
    const downloadIndexRegex = /<script>window\.DOWNLOAD_INDEX\s*=\s*window\.DOWNLOAD_INDEX\s*\|\|\s*\{[^}]*\}[^<]*<\/script>/;
    
    // Create the new download index script
    const newDownloadIndexScript = `<script>window.DOWNLOAD_INDEX = window.DOWNLOAD_INDEX || ${JSON.stringify(downloadMapping, null, 2)};</script>`;
    
    // Replace the old download index with the new one
    if (downloadIndexRegex.test(appHtmlContent)) {
      appHtmlContent = appHtmlContent.replace(downloadIndexRegex, newDownloadIndexScript);
      console.log('Successfully updated DOWNLOAD_INDEX in app.html');
    } else {
      console.error('Could not find DOWNLOAD_INDEX pattern in app.html');
      process.exit(1);
    }
    
    // Write the updated content back to the file
    fs.writeFileSync(APP_HTML_FILE, appHtmlContent);
    console.log('Updated app.html with new download mapping');
    
    // Show a few sample mappings
    console.log('\nSample mappings updated:');
    const sampleKeys = Object.keys(downloadMapping).slice(0, 5);
    sampleKeys.forEach(key => {
      console.log(`  "${key}" -> "${downloadMapping[key]}"`);
    });
    
  } catch (error) {
    console.error('Error updating app.html:', error);
    process.exit(1);
  }
}

main();