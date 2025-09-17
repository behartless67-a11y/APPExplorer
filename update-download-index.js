const XLSX = require('xlsx');
const fs = require('fs');

// Read the updated spreadsheet
const workbook = XLSX.readFile('../FixedAPPLibraryMapping.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const spreadsheetData = XLSX.utils.sheet_to_json(worksheet);

// Read blob storage data
const blobData = JSON.parse(fs.readFileSync('data/comprehensive-storage-analysis.json', 'utf8'));
const blobFiles = blobData.sources?.azureFileList?.files || [];

// Build download index for projects that exist in blob storage
const downloadIndex = {};

spreadsheetData.forEach(row => {
  if (row.Name &&
      row.Name.toLowerCase().endsWith('.pdf') &&
      row['Item Type'] === 'Item' &&
      row['Project Name']) {

    const filename = row.Name;
    const projectTitle = row['Project Name'];

    // Check if file exists in blob storage
    const isInBlob = blobFiles.some(blobFile =>
      blobFile.toLowerCase() === filename.toLowerCase()
    );

    if (isInBlob) {
      // Use projects/ prefix for the download path
      downloadIndex[projectTitle] = `projects/${filename}`;
    }
  }
});

console.log(`Created download index with ${Object.keys(downloadIndex).length} available downloads`);

// Show a few examples
console.log('\nFirst 5 available downloads:');
Object.entries(downloadIndex).slice(0, 5).forEach(([title, path]) => {
  console.log(`- ${title}`);
  console.log(`  File: ${path}`);
});

// Save the updated download index
fs.writeFileSync('projects_downloads_index.json', JSON.stringify(downloadIndex, null, 2));

console.log('\nUpdated download index saved to projects_downloads_index.json');

// Also check if our test project is included
if (downloadIndex['A Conversation Can Save a Life: Strategies to Reduce Firearm Suicides']) {
  console.log('\n✅ Target project found in download index!');
} else {
  console.log('\n❌ Target project still missing from blob storage');
}