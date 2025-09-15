const fs = require('fs');

// Load data
const mapping = JSON.parse(fs.readFileSync('data/download-mapping.json', 'utf8'));
const data = JSON.parse(fs.readFileSync('app.html', 'utf8').match(/const DATA = ({.*?});/s)[1]);
const missingProjects = data.projects.filter(p => !mapping[p.title]);

// Get numbered files that are currently mapped
const mappedFiles = Object.values(mapping).map(f => f.replace('projects/', ''));
const numberedFiles = mappedFiles.filter(f => /^\d+_/.test(f));

// Find which projects are mapped to numbered files
const numberedFileMappings = [];
Object.entries(mapping).forEach(([projectTitle, filePath]) => {
  const fileName = filePath.replace('projects/', '');
  if (/^\d+_/.test(fileName)) {
    numberedFileMappings.push({
      projectTitle,
      fileName,
      fileNumber: parseInt(fileName.match(/^(\d+)_/)[1])
    });
  }
});

// Sort by file number
numberedFileMappings.sort((a, b) => a.fileNumber - b.fileNumber);

console.log('=== NUMBERED FILE VERIFICATION STRATEGY ===');
console.log('Total numbered files currently mapped:', numberedFiles.length);
console.log('Projects missing download buttons:', missingProjects.length);
console.log();
console.log('STRATEGY: Check if numbered files contain different titles than mapped');
console.log();

console.log('=== FIRST 10 NUMBERED FILES TO VERIFY ===');
console.log('Download these and check if the first page title matches the mapped project:');
console.log();

numberedFileMappings.slice(0, 10).forEach((item, i) => {
  console.log(`${i+1}. FILE: "${item.fileName}"`);
  console.log(`   MAPPED TO: "${item.projectTitle}"`);
  console.log(`   CHECK: Does the PDF first page actually say "${item.projectTitle}"?`);
  console.log();
});

console.log('=== SAMPLE MISSING PROJECT TITLES ===');
console.log('If the numbered files contain different titles, look for these:');
missingProjects.slice(0, 10).forEach((project, i) => {
  console.log(`${i+1}. "${project.title}" (${project.instructor})`);
});

console.log();
console.log('=== VERIFICATION PROCESS ===');
console.log('1. Download the first 10 numbered files above');
console.log('2. Check if the PDF title matches the mapped project title');
console.log('3. If different, see if it matches any of the 78 missing projects');
console.log('4. Update mappings for any mismatched files');
console.log('5. This could potentially recover some of the 78 missing projects');

// Generate download test for first 5 files
console.log();
console.log('=== TEST DOWNLOADS ===');
console.log('Use these file paths to test downloads:');
numberedFileMappings.slice(0, 5).forEach((item, i) => {
  console.log(`${i+1}. "projects/${item.fileName}"`);
});