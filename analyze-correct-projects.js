const XLSX = require('xlsx');
const fs = require('fs');

// Read both files to understand the relationship
const originalWorkbook = XLSX.readFile('APPLibrary.xlsx');
const originalSheet = originalWorkbook.Sheets[originalWorkbook.SheetNames[0]];
const originalData = XLSX.utils.sheet_to_json(originalSheet);

const fixedWorkbook = XLSX.readFile('FixedAPPLibraryMapping.xlsx');
const fixedSheet = fixedWorkbook.Sheets[fixedWorkbook.SheetNames[0]];
const fixedData = XLSX.utils.sheet_to_json(fixedSheet);

console.log('=== ORIGINAL APPLibrary.xlsx ===');
console.log('Total rows:', originalData.length);

// Filter original data for actual projects
const originalProjects = originalData.filter(row =>
  row.Name &&
  row.Name.toLowerCase().endsWith('.pdf') &&
  row['Item Type'] === 'Item' &&
  row['Project Name']
);

console.log('Original projects (PDF + Project Name):', originalProjects.length);

console.log('\\n=== FIXED APPLibraryMapping.xlsx ===');
console.log('Total rows:', fixedData.length);

// Filter fixed data for PDF files
const fixedPDFs = fixedData.filter(row =>
  row.Name &&
  row.Name.toLowerCase().endsWith('.pdf') &&
  row['Item Type'] === 'Item'
);

console.log('Fixed file PDFs (Item type):', fixedPDFs.length);

// The issue might be that the fixed file has all SharePoint items, not just projects
// Let's see what types of items are in the fixed file
const itemTypes = {};
fixedData.forEach(row => {
  const type = row['Item Type'] || 'Unknown';
  itemTypes[type] = (itemTypes[type] || 0) + 1;
});

console.log('\\nFixed file Item Types:');
Object.entries(itemTypes).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

// Check if we need to use the original file for project info and fixed file for mapping
console.log('\\n=== COMPARISON ===');
console.log('Original projects should be our target (~650):', originalProjects.length);

// Let's use the original file as the source of truth for projects
// and check how many have files in blob storage
const blobData = JSON.parse(fs.readFileSync('data/comprehensive-storage-analysis.json', 'utf8'));
const blobFiles = blobData.sources?.azureFileList?.files || [];

// Create download index using original projects data
const downloadIndex = {};
let availableCount = 0;

originalProjects.forEach(project => {
  const filename = project.Name;
  const projectTitle = project['Project Name'];

  // Check if file exists in blob storage
  const isInBlob = blobFiles.some(blobFile => blobFile === filename);

  if (isInBlob) {
    downloadIndex[projectTitle] = `projects/${filename}`;
    availableCount++;
  }
});

console.log(`\nUsing original data: ${availableCount} projects have downloads available`);
console.log(`Out of ${originalProjects.length} total projects`);

// Check our target project in original data
const targetInOriginal = originalProjects.find(p =>
  p['Project Name'] && p['Project Name'].toLowerCase().includes('conversation can save a life')
);

if (targetInOriginal) {
  console.log('\\n=== TARGET PROJECT IN ORIGINAL ===');
  console.log('Title:', targetInOriginal['Project Name']);
  console.log('Filename:', targetInOriginal.Name);

  const isInBlob = blobFiles.some(blob => blob === targetInOriginal.Name);
  console.log('In blob storage:', isInBlob);
} else {
  console.log('\\n❌ Target project not found in original data');
}

// Save the corrected download index
fs.writeFileSync('projects_downloads_index_corrected.json', JSON.stringify(downloadIndex, null, 2));

console.log('\\nCorrected download index saved to projects_downloads_index_corrected.json');