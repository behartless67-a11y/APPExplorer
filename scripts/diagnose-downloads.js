/**
 * Diagnostic script to help troubleshoot download issues
 */
const fs = require('fs');
const path = require('path');

const DOWNLOAD_MAPPING_FILE = path.resolve('data/download-mapping.json');

function main() {
  try {
    console.log('=== DOWNLOAD DIAGNOSTIC REPORT ===\n');
    
    if (!fs.existsSync(DOWNLOAD_MAPPING_FILE)) {
      console.error('❌ Download mapping file not found:', DOWNLOAD_MAPPING_FILE);
      return;
    }

    // Read the download mapping
    const downloadMapping = JSON.parse(fs.readFileSync(DOWNLOAD_MAPPING_FILE, 'utf8'));
    const fileNames = Object.values(downloadMapping);
    
    console.log(`📊 Total projects with download files: ${Object.keys(downloadMapping).length}`);
    console.log(`📁 Total unique files: ${new Set(fileNames).size}`);
    
    // Analyze file types
    console.log('\n📋 File type breakdown:');
    const fileTypes = {};
    fileNames.forEach(fileName => {
      const ext = path.extname(fileName).toLowerCase();
      fileTypes[ext] = (fileTypes[ext] || 0) + 1;
    });
    
    Object.entries(fileTypes).sort((a, b) => b[1] - a[1]).forEach(([ext, count]) => {
      console.log(`   ${ext || '[no extension]'}: ${count} files`);
    });
    
    // Check for potential filename issues
    console.log('\n🔍 Potential filename issues:');
    const issues = [];
    
    // Check for special characters that might cause issues
    const problematicFiles = fileNames.filter(fileName => {
      return /[<>:"|?*]/.test(fileName) || fileName.includes('\\') || fileName.includes('/');
    });
    
    if (problematicFiles.length > 0) {
      console.log(`   ⚠️  Files with special characters: ${problematicFiles.length}`);
      problematicFiles.slice(0, 5).forEach(file => console.log(`      - ${file}`));
      if (problematicFiles.length > 5) console.log(`      ... and ${problematicFiles.length - 5} more`);
    }
    
    // Check for very long filenames
    const longFiles = fileNames.filter(fileName => fileName.length > 100);
    if (longFiles.length > 0) {
      console.log(`   ⚠️  Files with long names (>100 chars): ${longFiles.length}`);
      longFiles.slice(0, 3).forEach(file => console.log(`      - ${file.substring(0, 80)}...`));
    }
    
    // Show sample mappings for testing
    console.log('\n🧪 Sample files to test in Azure blob storage:');
    const sampleEntries = Object.entries(downloadMapping).slice(0, 5);
    sampleEntries.forEach(([title, fileName]) => {
      console.log(`   📄 "${title.substring(0, 60)}${title.length > 60 ? '...' : ''}"`);
      console.log(`      File: ${fileName}`);
      console.log(`      Azure path: project-files/${fileName}`);
      console.log('');
    });
    
    // Azure configuration check
    console.log('🔧 Expected Azure configuration:');
    console.log('   Account: projectexplorerfiles');
    console.log('   Container: project-files');
    console.log('   Environment variables needed:');
    console.log('   - AZURE_STORAGE_ACCOUNT_NAME (optional, defaults to projectexplorerfiles)');
    console.log('   - AZURE_STORAGE_ACCOUNT_KEY (required)');
    console.log('   - AZURE_STORAGE_CONTAINER_NAME (optional, defaults to project-files)');
    
    // Generate a list of all filenames for Azure verification
    const uniqueFiles = [...new Set(fileNames)].sort();
    const fileListPath = path.resolve('data/azure-file-list.txt');
    fs.writeFileSync(fileListPath, uniqueFiles.join('\n'));
    console.log(`\n📝 Complete file list written to: ${fileListPath}`);
    console.log('   You can use this to verify which files exist in your Azure blob storage.');
    
  } catch (error) {
    console.error('Error running diagnostic:', error);
  }
}

main();