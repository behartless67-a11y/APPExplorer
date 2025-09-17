const XLSX = require('xlsx');
const fs = require('fs');

// Read the updated spreadsheet
const workbook = XLSX.readFile('../FixedAPPLibraryMapping.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const spreadsheetData = XLSX.utils.sheet_to_json(worksheet);

// Read blob storage data
const blobData = JSON.parse(fs.readFileSync('data/comprehensive-storage-analysis.json', 'utf8'));
const blobFiles = blobData.sources?.azureFileList?.files || [];

// Filter for actual project files from spreadsheet
const projectsFromSpreadsheet = spreadsheetData.filter(row =>
  row.Name &&
  row.Name.toLowerCase().endsWith('.pdf') &&
  row['Item Type'] === 'Item'
);

console.log(`Spreadsheet PDF files: ${projectsFromSpreadsheet.length}`);
console.log(`Blob storage files: ${blobFiles.length}`);

// Check exact matches
let exactMatches = 0;
let mismatches = [];

projectsFromSpreadsheet.forEach(project => {
  const spreadsheetName = project.Name;
  const exactMatch = blobFiles.find(blobFile => blobFile === spreadsheetName);

  if (exactMatch) {
    exactMatches++;
  } else {
    // Look for close matches (case insensitive)
    const closeMatch = blobFiles.find(blobFile =>
      blobFile.toLowerCase() === spreadsheetName.toLowerCase()
    );

    mismatches.push({
      spreadsheetName: spreadsheetName,
      closeMatch: closeMatch || 'No match found',
      projectTitle: project['Project Name'] || 'Unknown'
    });
  }
});

console.log(`\nExact matches: ${exactMatches}`);
console.log(`Mismatches: ${mismatches.length}`);

// Show first 10 mismatches
console.log('\nFirst 10 mismatches:');
mismatches.slice(0, 10).forEach((mismatch, i) => {
  console.log(`${i+1}. Spreadsheet: "${mismatch.spreadsheetName}"`);
  console.log(`   Blob storage: "${mismatch.closeMatch}"`);
  console.log(`   Project: ${mismatch.projectTitle}`);
  console.log('');
});

// Let's also check our target project specifically
const targetProject = projectsFromSpreadsheet.find(p =>
  p['Project Name'] && p['Project Name'].toLowerCase().includes('conversation can save a life')
);

if (targetProject) {
  console.log('=== TARGET PROJECT CHECK ===');
  console.log('Spreadsheet filename:', targetProject.Name);

  const blobMatch = blobFiles.find(blob => blob === targetProject.Name);
  const closeMatch = blobFiles.find(blob =>
    blob.toLowerCase() === targetProject.Name.toLowerCase()
  );

  console.log('Exact blob match:', blobMatch || 'None');
  console.log('Close blob match:', closeMatch || 'None');
}