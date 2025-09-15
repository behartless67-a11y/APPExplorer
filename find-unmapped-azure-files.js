const fs = require('fs');

// Load existing mapping
const mapping = JSON.parse(fs.readFileSync('data/download-mapping.json', 'utf8'));
const mappedFiles = Object.values(mapping).map(f => f.replace('projects/', ''));

// Load all files from Azure
const azureFiles = fs.readFileSync('data/azure-file-list.txt', 'utf8')
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.includes('→'))
  .map(line => line.split('→')[1] || line);

console.log('=== AZURE BLOB STORAGE ANALYSIS ===');
console.log('Total files in Azure blob storage:', azureFiles.length);
console.log('Files currently mapped to projects:', mappedFiles.length);

// Find unmapped files
const unmappedFiles = azureFiles.filter(file => !mappedFiles.includes(file));

console.log('Files in Azure but NOT mapped to projects:', unmappedFiles.length);
console.log();

if (unmappedFiles.length > 0) {
  console.log('=== FIRST 15 UNMAPPED FILES ===');
  unmappedFiles.slice(0, 15).forEach((file, i) => {
    console.log(`${i+1}. "${file}"`);
  });
  
  console.log();
  console.log('=== UNMAPPED FILE PATTERNS ===');
  
  // Analyze patterns
  const patterns = {
    numbered: unmappedFiles.filter(f => /^\d+_/.test(f)),
    authorNamed: unmappedFiles.filter(f => /^[a-z]+/.test(f) && !f.startsWith('APP')),
    appNamed: unmappedFiles.filter(f => f.startsWith('APP') || f.includes('APP')),
    other: unmappedFiles.filter(f => 
      !/^\d+_/.test(f) && 
      !/^[a-z]+/.test(f) && 
      !f.startsWith('APP')
    )
  };
  
  console.log(`Numbered files (###_Name.pdf): ${patterns.numbered.length}`);
  console.log(`Author-named files: ${patterns.authorNamed.length}`);
  console.log(`APP-related files: ${patterns.appNamed.length}`);
  console.log(`Other patterns: ${patterns.other.length}`);
  
  console.log();
  console.log('=== POTENTIAL MATCHES FOR MISSING PROJECTS ===');
  console.log('These unmapped files could potentially match the 78 missing projects:');
  
  if (patterns.numbered.length > 0) {
    console.log('\nNumbered files (likely contain project titles):');
    patterns.numbered.slice(0, 10).forEach(f => console.log(`  ${f}`));
  }
  
  if (patterns.authorNamed.length > 0) {
    console.log('\nAuthor-named files:');
    patterns.authorNamed.slice(0, 10).forEach(f => console.log(`  ${f}`));
  }
} else {
  console.log('All Azure files are already mapped to projects.');
}

console.log();
console.log('=== STRATEGY RECOMMENDATION ===');
console.log('To link the 78 missing projects:');
console.log('1. Check numbered files (likely have project titles on first page)');
console.log('2. Check author-named files for potential matches');
console.log('3. Contact instructors for missing files');
console.log('4. Use fuzzy matching algorithms');