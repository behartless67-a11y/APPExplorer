const XLSX = require('xlsx');
const fs = require('fs');

// Read the updated spreadsheet
const workbook = XLSX.readFile('../FixedAPPLibraryMapping.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const allData = XLSX.utils.sheet_to_json(worksheet);

console.log('Total rows in spreadsheet:', allData.length);
console.log('Columns:', Object.keys(allData[0] || {}));

// Analyze the data structure
console.log('\n=== DATA ANALYSIS ===');

// Check Item Types
const itemTypes = {};
allData.forEach(row => {
  const type = row['Item Type'] || 'Unknown';
  itemTypes[type] = (itemTypes[type] || 0) + 1;
});

console.log('\nItem Types:');
Object.entries(itemTypes).forEach(([type, count]) => {
  console.log(`  ${type}: ${count}`);
});

// Filter for actual projects (PDF files with Item type)
const actualProjects = allData.filter(row =>
  row.Name &&
  row.Name.toLowerCase().endsWith('.pdf') &&
  row['Item Type'] === 'Item' &&
  row['Project Name'] // Must have a project name
);

console.log(`\nActual projects (PDF + Item + Project Name): ${actualProjects.length}`);

// Check for duplicates by project name
const projectTitles = {};
const duplicatesByTitle = [];

actualProjects.forEach(project => {
  const title = project['Project Name'];
  if (projectTitles[title]) {
    projectTitles[title].push(project);
    if (projectTitles[title].length === 2) {
      duplicatesByTitle.push(title);
    }
  } else {
    projectTitles[title] = [project];
  }
});

console.log(`\nUnique project titles: ${Object.keys(projectTitles).length}`);
console.log(`Duplicate project titles: ${duplicatesByTitle.length}`);

// Show some duplicates
if (duplicatesByTitle.length > 0) {
  console.log('\nFirst 5 duplicate titles:');
  duplicatesByTitle.slice(0, 5).forEach(title => {
    console.log(`- "${title}"`);
    projectTitles[title].forEach(proj => {
      console.log(`  File: ${proj.Name}`);
    });
  });
}

// Check for duplicates by filename
const filenames = {};
const duplicatesByFilename = [];

actualProjects.forEach(project => {
  const filename = project.Name;
  if (filenames[filename]) {
    filenames[filename].push(project);
    if (filenames[filename].length === 2) {
      duplicatesByFilename.push(filename);
    }
  } else {
    filenames[filename] = [project];
  }
});

console.log(`\nUnique filenames: ${Object.keys(filenames).length}`);
console.log(`Duplicate filenames: ${duplicatesByFilename.length}`);

// Show some filename duplicates
if (duplicatesByFilename.length > 0) {
  console.log('\nFirst 5 duplicate filenames:');
  duplicatesByFilename.slice(0, 5).forEach(filename => {
    console.log(`- "${filename}"`);
    filenames[filename].forEach(proj => {
      console.log(`  Title: ${proj['Project Name']}`);
    });
  });
}

// Create a cleaned dataset - one entry per unique project title
const cleanedProjects = {};
actualProjects.forEach(project => {
  const title = project['Project Name'];
  if (!cleanedProjects[title]) {
    cleanedProjects[title] = project;
  }
});

console.log(`\nCleaned unique projects: ${Object.keys(cleanedProjects).length}`);

// Save analysis
fs.writeFileSync('data/duplicate-analysis.json', JSON.stringify({
  timestamp: new Date().toISOString(),
  analysis: {
    totalRows: allData.length,
    itemTypes: itemTypes,
    actualProjects: actualProjects.length,
    uniqueTitles: Object.keys(projectTitles).length,
    uniqueFilenames: Object.keys(filenames).length,
    duplicatesByTitle: duplicatesByTitle.length,
    duplicatesByFilename: duplicatesByFilename.length,
    cleanedUnique: Object.keys(cleanedProjects).length
  },
  duplicateTitles: duplicatesByTitle,
  duplicateFilenames: duplicatesByFilename
}, null, 2));

console.log('\nAnalysis saved to data/duplicate-analysis.json');