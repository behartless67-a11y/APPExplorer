const XLSX = require('xlsx');
const fs = require('fs');

// Read both spreadsheet files
const originalWorkbook = XLSX.readFile('APPLibrary.xlsx');
const originalSheet = originalWorkbook.Sheets[originalWorkbook.SheetNames[0]];
const originalData = XLSX.utils.sheet_to_json(originalSheet);

const fixedWorkbook = XLSX.readFile('FixedAPPLibraryMapping.xlsx');
const fixedSheet = fixedWorkbook.Sheets[fixedWorkbook.SheetNames[0]];
const fixedData = XLSX.utils.sheet_to_json(fixedSheet);

// Read blob storage data
const blobData = JSON.parse(fs.readFileSync('data/comprehensive-storage-analysis.json', 'utf8'));
const blobFiles = blobData.sources?.azureFileList?.files || [];

// Get projects that were ONLY in the original data (to identify the baseline)
const originalProjectTitles = new Set();
originalData.forEach(project => {
  if (project.Name &&
      project.Name.toLowerCase().endsWith('.pdf') &&
      project['Item Type'] === 'Item' &&
      project['Project Name']) {
    originalProjectTitles.add(project['Project Name']);
  }
});

console.log(`Original projects: ${originalProjectTitles.size}`);

// Find the NEW projects that were added from FixedAPPLibraryMapping.xlsx
const newProjects = [];
fixedData.forEach(item => {
  if (item.Name &&
      item.Name.toLowerCase().endsWith('.pdf') &&
      item['Item Type'] === 'Item' &&
      item['Project Name']) {

    const title = item['Project Name'];

    // Only include if NOT in original data (these are the newly added ones)
    if (!originalProjectTitles.has(title)) {
      newProjects.push({
        title: title,
        filename: item.Name,
        instructor: item.Instructor || 'Unknown',
        clientOrg: item['Client Org Name'] || 'Unknown'
      });
    }
  }
});

console.log(`\nNewly added projects from FixedAPPLibraryMapping.xlsx: ${newProjects.length}`);

// Check which of these new projects have files in blob storage
const newProjectsWithDownloads = [];
const newProjectsWithoutDownloads = [];

newProjects.forEach(project => {
  const filename = project.filename;
  const hasFile = blobFiles.some(blobFile => blobFile === filename);

  if (hasFile) {
    newProjectsWithDownloads.push(project);
  } else {
    newProjectsWithoutDownloads.push(project);
  }
});

console.log(`\n=== RESULTS FOR NEWLY ADDED PROJECTS ===`);
console.log(`✅ New projects WITH download buttons: ${newProjectsWithDownloads.length}`);
console.log(`❌ New projects WITHOUT download buttons: ${newProjectsWithoutDownloads.length}`);

// Show some examples of projects with downloads
if (newProjectsWithDownloads.length > 0) {
  console.log(`\n✅ FIRST 10 NEW PROJECTS WITH WORKING DOWNLOADS:`);
  newProjectsWithDownloads.slice(0, 10).forEach((project, i) => {
    console.log(`${i+1}. "${project.title}"`);
    console.log(`   Instructor: ${project.instructor}`);
    console.log(`   File: ${project.filename}`);
    console.log('');
  });
}

// Show some examples of projects without downloads
if (newProjectsWithoutDownloads.length > 0) {
  console.log(`\n❌ FIRST 5 NEW PROJECTS STILL MISSING FILES:`);
  newProjectsWithoutDownloads.slice(0, 5).forEach((project, i) => {
    console.log(`${i+1}. "${project.title}"`);
    console.log(`   File: ${project.filename}`);
    console.log('');
  });
}

// Save detailed report
fs.writeFileSync('data/newly-available-downloads.json', JSON.stringify({
  timestamp: new Date().toISOString(),
  summary: {
    totalNewProjects: newProjects.length,
    newProjectsWithDownloads: newProjectsWithDownloads.length,
    newProjectsStillMissing: newProjectsWithoutDownloads.length,
    successRate: Math.round((newProjectsWithDownloads.length / newProjects.length) * 100)
  },
  newProjectsWithDownloads: newProjectsWithDownloads,
  newProjectsWithoutDownloads: newProjectsWithoutDownloads
}, null, 2));

console.log(`\n📊 SUCCESS RATE: ${Math.round((newProjectsWithDownloads.length / newProjects.length) * 100)}% of new projects have working downloads`);
console.log('📄 Detailed report saved to data/newly-available-downloads.json');