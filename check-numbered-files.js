const fs = require('fs');

// Load data
const mapping = JSON.parse(fs.readFileSync('data/download-mapping.json', 'utf8'));
const data = JSON.parse(fs.readFileSync('app.html', 'utf8').match(/const DATA = ({.*?});/s)[1]);
const missingProjects = data.projects.filter(p => !mapping[p.title]);

// Get Azure files
const azureFiles = fs.readFileSync('data/azure-file-list.txt', 'utf8')
  .split('\n')
  .map(line => {
    const match = line.match(/^\s*\d+→(.+)$/);
    return match ? match[1].trim() : line.trim();
  })
  .filter(file => file);

// Find numbered files that aren't mapped
const mappedFiles = Object.values(mapping).map(f => f.replace('projects/', ''));
const numberedFiles = azureFiles.filter(f => /^\d+_/.test(f));
const unmappedNumberedFiles = numberedFiles.filter(f => !mappedFiles.includes(f));

console.log('=== ANALYSIS: NUMBERED FILES vs MISSING PROJECTS ===');
console.log('Total projects in system:', data.projects.length);
console.log('Projects with download buttons:', Object.keys(mapping).length);
console.log('Projects missing download buttons:', missingProjects.length);
console.log();
console.log('Total numbered files (###_Title.pdf):', numberedFiles.length);
console.log('Numbered files NOT mapped to projects:', unmappedNumberedFiles.length);

if (unmappedNumberedFiles.length > 0) {
  console.log();
  console.log('=== UNMAPPED NUMBERED FILES TO CHECK ===');
  console.log('These files need first-page title verification:');
  unmappedNumberedFiles.slice(0, 15).forEach((file, i) => {
    console.log(`${i+1}. ${file}`);
  });
  
  console.log();
  console.log('=== MISSING PROJECTS TO MATCH ===');
  console.log('Sample missing project titles:');
  missingProjects.slice(0, 10).forEach((project, i) => {
    console.log(`${i+1}. "${project.title}" (${project.instructor})`);
  });
  
  console.log();
  console.log('=== NEXT STEPS ===');
  console.log('1. Download the unmapped numbered files');
  console.log('2. Check the first page of each PDF for the actual project title');
  console.log('3. Match against the 121 missing project titles');
  console.log('4. Add successful matches to download-mapping.json');
  console.log();
  console.log('STRATEGY: Start with the first 5-10 unmapped numbered files');
  console.log('to see if this approach will work before checking all of them.');
  
} else {
  console.log();
  console.log('=== RESULT ===');
  console.log('All numbered files are already mapped to projects.');
  console.log('The 121 missing projects likely need to be collected from other sources.');
}

// Generate test URLs for first 5 unmapped numbered files
if (unmappedNumberedFiles.length > 0) {
  console.log();
  console.log('=== TEST DOWNLOADS FOR VERIFICATION ===');
  console.log('Try downloading these files to check their first pages:');
  unmappedNumberedFiles.slice(0, 5).forEach((file, i) => {
    console.log(`${i+1}. File: "projects/${file}"`);
    console.log(`   Use secure-download API to get download URL`);
  });
}