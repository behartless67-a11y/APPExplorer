/**
 * Fix the download mapping to include the projects/ subfolder
 */
const fs = require('fs');
const path = require('path');

const DOWNLOAD_MAPPING_FILE = path.resolve('data/download-mapping.json');

function main() {
  try {
    console.log('Fixing download mapping for projects/ subfolder...');
    
    // Read current mapping
    const downloadMapping = JSON.parse(fs.readFileSync(DOWNLOAD_MAPPING_FILE, 'utf8'));
    
    // Update all filenames to include projects/ prefix
    const updatedMapping = {};
    Object.entries(downloadMapping).forEach(([title, filename]) => {
      updatedMapping[title] = `projects/${filename}`;
    });
    
    // Write updated mapping
    fs.writeFileSync(DOWNLOAD_MAPPING_FILE, JSON.stringify(updatedMapping, null, 2));
    
    console.log(`Updated ${Object.keys(updatedMapping).length} file paths to include projects/ subfolder`);
    
    // Show a few examples
    console.log('\nSample updated paths:');
    Object.entries(updatedMapping).slice(0, 3).forEach(([title, filename]) => {
      console.log(`"${title.substring(0, 50)}..." -> "${filename}"`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();