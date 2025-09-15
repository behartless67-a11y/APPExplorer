const fs = require('fs');
const path = require('path');

// Read the data files
const projectsPath = path.join(__dirname, '../data/projects.json');
const downloadMappingPath = path.join(__dirname, '../data/download-mapping.json');
const azureFileListPath = path.join(__dirname, '../data/azure-file-list.txt');

// Load projects
const projects = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));
console.log(`Total projects in projects.json: ${projects.length}`);

// Load download mapping
const downloadMapping = JSON.parse(fs.readFileSync(downloadMappingPath, 'utf8'));
const mappedTitles = Object.keys(downloadMapping);
console.log(`Projects with download mapping: ${mappedTitles.length}`);

// Load Azure file list - debug the reading
const azureFileContent = fs.readFileSync(azureFileListPath, 'utf8');
const azureFiles = azureFileContent
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
console.log(`Files in Azure storage: ${azureFiles.length}`);

// Find projects without download mapping
const unmappedProjects = projects.filter(project => 
    !mappedTitles.includes(project.project_title)
);

console.log(`\nProjects without download mapping: ${unmappedProjects.length}`);

// Debug: Show difference between projects count and mappings
console.log(`Expected unmapped projects: ${projects.length - mappedTitles.length}`);

// Check for duplicates in projects
const projectTitles = projects.map(p => p.project_title);
const uniqueTitles = new Set(projectTitles);
console.log(`Unique project titles: ${uniqueTitles.size}`);
console.log(`Duplicate titles: ${projectTitles.length - uniqueTitles.size}`);

// Find duplicate projects
const titleCounts = {};
projectTitles.forEach(title => {
    titleCounts[title] = (titleCounts[title] || 0) + 1;
});

const duplicateProjects = Object.entries(titleCounts)
    .filter(([title, count]) => count > 1)
    .map(([title, count]) => ({ title, count }));

console.log(`\nProjects with duplicate titles: ${duplicateProjects.length}`);

// Create sets for easier comparison
const mappedFileNames = new Set(Object.values(downloadMapping).map(path => 
    path.replace('projects/', '')
));

const azureFileSet = new Set(azureFiles);

// Find files in mapping but not in Azure
const missingFromAzure = [];
Object.values(downloadMapping).forEach(filePath => {
    const fileName = filePath.replace('projects/', '');
    if (!azureFileSet.has(fileName)) {
        missingFromAzure.push(fileName);
    }
});

// Find files in Azure but not in mapping
const unmappedAzureFiles = azureFiles.filter(fileName => 
    !mappedFileNames.has(fileName)
);

console.log(`\nFiles in mapping but missing from Azure: ${missingFromAzure.length}`);
console.log(`Files in Azure but not mapped: ${unmappedAzureFiles.length}`);

// Output detailed results
console.log('\n=== DETAILED ANALYSIS ===\n');

console.log('UNMAPPED PROJECTS (no file mapping):');
unmappedProjects.slice(0, 20).forEach((project, index) => {
    console.log(`${index + 1}. ${project.project_title} (${project.instructor}, ${project.year})`);
});
if (unmappedProjects.length > 20) {
    console.log(`... and ${unmappedProjects.length - 20} more`);
}

console.log('\nFILES IN MAPPING BUT MISSING FROM AZURE:');
missingFromAzure.slice(0, 20).forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
});
if (missingFromAzure.length > 20) {
    console.log(`... and ${missingFromAzure.length - 20} more`);
}

console.log('\nFILES IN AZURE BUT NOT MAPPED TO PROJECTS:');
unmappedAzureFiles.slice(0, 20).forEach((file, index) => {
    console.log(`${index + 1}. ${file}`);
});
if (unmappedAzureFiles.length > 20) {
    console.log(`... and ${unmappedAzureFiles.length - 20} more`);
}

console.log('\nDUPLICATE PROJECTS:');
duplicateProjects.slice(0, 10).forEach((dup, index) => {
    console.log(`${index + 1}. "${dup.title}" (appears ${dup.count} times)`);
    
    // Show the actual duplicate entries
    const duplicateEntries = projects.filter(p => p.project_title === dup.title);
    duplicateEntries.forEach((entry, entryIndex) => {
        console.log(`    ${entryIndex + 1}. ID: ${entry.id}, Instructor: ${entry.instructor}, Year: ${entry.year}`);
    });
    console.log('');
});
if (duplicateProjects.length > 10) {
    console.log(`... and ${duplicateProjects.length - 10} more duplicate sets`);
}

// Save detailed unmapped projects list
const unmappedOutput = {
    totalProjects: projects.length,
    mappedProjects: mappedTitles.length,
    uniqueProjects: uniqueTitles.size,
    duplicateCount: projects.length - uniqueTitles.size,
    unmappedProjects: unmappedProjects.length,
    azureFiles: azureFiles.length,
    missingFromAzureCount: missingFromAzure.length,
    unmappedAzureFilesCount: unmappedAzureFiles.length,
    duplicateProjects: duplicateProjects,
    unmappedProjectsList: unmappedProjects,
    missingFromAzureList: missingFromAzure,
    unmappedAzureFilesList: unmappedAzureFiles
};

fs.writeFileSync(
    path.join(__dirname, '../data/missing-files-analysis.json'),
    JSON.stringify(unmappedOutput, null, 2)
);

console.log('\nDetailed analysis saved to data/missing-files-analysis.json');