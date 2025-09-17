const XLSX = require('xlsx');
const fs = require('fs');

// Read both spreadsheet files
console.log('=== READING SPREADSHEETS ===');

// Original projects with full metadata
const originalWorkbook = XLSX.readFile('APPLibrary.xlsx');
const originalSheet = originalWorkbook.Sheets[originalWorkbook.SheetNames[0]];
const originalData = XLSX.utils.sheet_to_json(originalSheet);

// Fixed mapping with all SharePoint files
const fixedWorkbook = XLSX.readFile('FixedAPPLibraryMapping.xlsx');
const fixedSheet = fixedWorkbook.Sheets[fixedWorkbook.SheetNames[0]];
const fixedData = XLSX.utils.sheet_to_json(fixedSheet);

// Read updated blob storage data
const blobData = JSON.parse(fs.readFileSync('data/comprehensive-storage-analysis.json', 'utf8'));
const blobFiles = blobData.sources?.azureFileList?.files || [];

console.log(`Original projects: ${originalData.length}`);
console.log(`Fixed file entries: ${fixedData.length}`);
console.log(`Blob storage files: ${blobFiles.length}`);

// Create comprehensive project mapping
const allProjects = new Map();

// Add original projects (these have full metadata)
originalData.forEach(project => {
  if (project.Name &&
      project.Name.toLowerCase().endsWith('.pdf') &&
      project['Item Type'] === 'Item' &&
      project['Project Name']) {

    allProjects.set(project['Project Name'], {
      title: project['Project Name'],
      filename: project.Name,
      source: 'original',
      email: project.Email,
      topic: project['Primary Topic'],
      instructor: project.Instructor,
      summary: project['Applied Policy Project Summary Paragraph']
    });
  }
});

console.log(`Projects from original file: ${allProjects.size}`);

// Add projects from fixed file that aren't in original
// These might be newer projects or ones missing from the original export
fixedData.forEach(item => {
  if (item.Name &&
      item.Name.toLowerCase().endsWith('.pdf') &&
      item['Item Type'] === 'Item' &&
      item['Project Name']) {

    const title = item['Project Name'];

    // Only add if not already present from original data
    if (!allProjects.has(title)) {
      allProjects.set(title, {
        title: title,
        filename: item.Name,
        source: 'fixed',
        email: item.Email || 'Unknown',
        topic: item['Primary Topic'] || 'Unknown',
        instructor: item.Instructor || 'Unknown',
        summary: item['Applied Policy Project Summary Paragraph'] || 'No summary available'
      });
    }
  }
});

console.log(`Total unique projects after merge: ${allProjects.size}`);

// Create download index for all projects that exist in blob storage
const downloadIndex = {};
let availableCount = 0;
let missingCount = 0;
const missingProjects = [];

allProjects.forEach((project, title) => {
  const filename = project.filename;

  // Check if file exists in blob storage
  const isInBlob = blobFiles.some(blobFile => blobFile === filename);

  if (isInBlob) {
    downloadIndex[title] = `projects/${filename}`;
    availableCount++;
  } else {
    missingCount++;
    missingProjects.push({
      title: title,
      filename: filename,
      source: project.source
    });
  }
});

console.log(`\n=== RECONCILIATION RESULTS ===`);
console.log(`Total unique projects: ${allProjects.size}`);
console.log(`Projects with downloads available: ${availableCount}`);
console.log(`Projects missing from blob storage: ${missingCount}`);

// Show some missing projects
console.log(`\nFirst 10 missing projects:`);
missingProjects.slice(0, 10).forEach((project, i) => {
  console.log(`${i+1}. ${project.title}`);
  console.log(`   File: ${project.filename} (from ${project.source})`);
});

// Verify our target project is included
const targetProject = 'A Conversation Can Save a Life: Strategies to Reduce Firearm Suicides';
if (downloadIndex[targetProject]) {
  console.log(`\n✅ Target project "${targetProject}" is in download index`);
} else {
  console.log(`\n❌ Target project "${targetProject}" is missing`);
}

// Save the comprehensive download index
fs.writeFileSync('projects_downloads_index_comprehensive.json', JSON.stringify(downloadIndex, null, 2));

// Save missing projects report
fs.writeFileSync('data/missing-projects-comprehensive.json', JSON.stringify({
  timestamp: new Date().toISOString(),
  summary: {
    totalProjects: allProjects.size,
    availableDownloads: availableCount,
    missingFromBlob: missingCount
  },
  missingProjects: missingProjects
}, null, 2));

console.log(`\nComprehensive download index saved (${availableCount} projects)`);
console.log('Missing projects report saved to data/missing-projects-comprehensive.json');