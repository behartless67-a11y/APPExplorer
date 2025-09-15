const fs = require('fs');

// Load existing data
const mapping = JSON.parse(fs.readFileSync('data/download-mapping.json', 'utf8'));
const mappedFiles = Object.values(mapping);

// Load the original Excel extraction to see all available files
const originalData = JSON.parse(fs.readFileSync('data/project-file-mapping.json', 'utf8'));
const allAvailableFiles = Object.values(originalData);

console.log('=== FILE MAPPING ANALYSIS ===');
console.log('Files currently mapped to projects:', mappedFiles.length);
console.log('Total files found in original Excel:', allAvailableFiles.length);

// Find files that exist but aren't mapped to any project
const unmappedFiles = allAvailableFiles.filter(file => !mappedFiles.includes(file));

console.log('Files available but not mapped:', unmappedFiles.length);
console.log();

if (unmappedFiles.length > 0) {
  console.log('=== FIRST 10 UNMAPPED FILES ===');
  unmappedFiles.slice(0, 10).forEach((file, i) => {
    console.log(`${i+1}. "${file}"`);
  });
  
  console.log();
  console.log('=== UNMAPPED FILE PATTERNS ===');
  
  // Analyze patterns in unmapped files
  const patterns = {
    numbered: unmappedFiles.filter(f => /^\d+_/.test(f.replace('projects/', ''))),
    authorNamed: unmappedFiles.filter(f => /^[a-z]+[a-z,]*_\d+_/.test(f.replace('projects/', ''))),
    other: unmappedFiles.filter(f => 
      !/^\d+_/.test(f.replace('projects/', '')) && 
      !/^[a-z]+[a-z,]*_\d+_/.test(f.replace('projects/', ''))
    )
  };
  
  console.log(`Numbered files (###_Title.pdf): ${patterns.numbered.length}`);
  console.log(`Author-named files (lastname_###_): ${patterns.authorNamed.length}`);
  console.log(`Other patterns: ${patterns.other.length}`);
  
  if (patterns.numbered.length > 0) {
    console.log('\nSample numbered files:');
    patterns.numbered.slice(0, 5).forEach(f => console.log(`  ${f}`));
  }
  
  if (patterns.authorNamed.length > 0) {
    console.log('\nSample author-named files:');
    patterns.authorNamed.slice(0, 5).forEach(f => console.log(`  ${f}`));
  }
} else {
  console.log('All available files are already mapped to projects.');
  console.log('The 78 missing projects likely need to be:');
  console.log('1. Collected from instructors');
  console.log('2. Found in other locations');
  console.log('3. Or verified if they were ever submitted');
}