const XLSX = require('xlsx');
const fs = require('fs');

// Read the updated spreadsheet
const workbook = XLSX.readFile('../FixedAPPLibraryMapping.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const spreadsheetData = XLSX.utils.sheet_to_json(worksheet);

// Read blob storage data
const blobData = JSON.parse(fs.readFileSync('data/comprehensive-storage-analysis.json', 'utf8'));
const blobFiles = blobData.sources?.azureFileList?.files || [];

// Filter for actual project files (exclude folders and metadata)
const projectsFromSpreadsheet = spreadsheetData.filter(row =>
  row.Name &&
  row.Name.toLowerCase().endsWith('.pdf') &&
  row['Item Type'] === 'Item'
);

console.log(`Total projects in spreadsheet: ${projectsFromSpreadsheet.length}`);
console.log(`Total files in blob storage: ${blobFiles.length}`);

// Find missing files
const missingFiles = [];
const foundFiles = [];

projectsFromSpreadsheet.forEach(project => {
  const filename = project.Name;
  const isInBlob = blobFiles.some(blobFile =>
    blobFile.toLowerCase() === filename.toLowerCase()
  );

  if (isInBlob) {
    foundFiles.push({
      title: project['Project Name'] || 'Unknown Title',
      filename: filename
    });
  } else {
    missingFiles.push({
      title: project['Project Name'] || 'Unknown Title',
      filename: filename,
      email: project.Email || 'Unknown'
    });
  }
});

console.log(`\nFiles found in blob storage: ${foundFiles.length}`);
console.log(`Files missing from blob storage: ${missingFiles.length}`);

// Check for our specific project
const targetProject = missingFiles.find(p =>
  p.title && p.title.toLowerCase().includes('conversation can save a life')
);

if (targetProject) {
  console.log('\n=== TARGET PROJECT FOUND IN MISSING FILES ===');
  console.log('Title:', targetProject.title);
  console.log('Filename:', targetProject.filename);
  console.log('Email:', targetProject.email);
} else {
  console.log('\n=== TARGET PROJECT NOT FOUND IN MISSING FILES ===');
  const foundTarget = foundFiles.find(p =>
    p.title && p.title.toLowerCase().includes('conversation can save a life')
  );
  if (foundTarget) {
    console.log('Found in blob storage:');
    console.log('Title:', foundTarget.title);
    console.log('Filename:', foundTarget.filename);
  }
}

// Show first 10 missing files
console.log('\n=== FIRST 10 MISSING FILES ===');
missingFiles.slice(0, 10).forEach((file, i) => {
  console.log(`${i+1}. ${file.title}`);
  console.log(`   File: ${file.filename}`);
  console.log(`   Email: ${file.email}`);
  console.log('');
});

// Save detailed missing files report
fs.writeFileSync('data/missing-files-detailed.json', JSON.stringify({
  timestamp: new Date().toISOString(),
  summary: {
    totalSpreadsheetProjects: projectsFromSpreadsheet.length,
    totalBlobFiles: blobFiles.length,
    foundFiles: foundFiles.length,
    missingFiles: missingFiles.length
  },
  missingFiles: missingFiles
}, null, 2));

console.log('\nDetailed report saved to data/missing-files-detailed.json');