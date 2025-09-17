const XLSX = require('xlsx');
const fs = require('fs');

// Read both spreadsheet files
const originalWorkbook = XLSX.readFile('APPLibrary.xlsx');
const originalSheet = originalWorkbook.Sheets[originalWorkbook.SheetNames[0]];
const originalData = XLSX.utils.sheet_to_json(originalSheet);

const fixedWorkbook = XLSX.readFile('FixedAPPLibraryMapping.xlsx');
const fixedSheet = fixedWorkbook.Sheets[fixedWorkbook.SheetNames[0]];
const fixedData = XLSX.utils.sheet_to_json(fixedSheet);

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
      summary: project['Applied Policy Project Summary Paragraph'] || 'No summary available',
      instructor: project.Instructor || 'Unknown',
      client_org_type: project['Client Org Type'] || 'Unknown',
      problem_level: project['Problem Level?'] || 'Unknown',
      geographic_scope_of_this_applied_policy_project: project['Geographic Scope of this Applied Policy Project'] || 'Unknown'
    });
  }
});

console.log(`Projects from original file: ${allProjects.size}`);

// Add projects from fixed file that aren't in original
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
        summary: item['Applied Policy Project Summary Paragraph'] || 'No summary available',
        instructor: item.Instructor || 'Unknown',
        client_org_type: item['Client Org Type'] || 'Unknown',
        problem_level: item['Problem Level?'] || 'Unknown',
        geographic_scope_of_this_applied_policy_project: item['Geographic Scope of this Applied Policy Project'] || 'Unknown'
      });
    }
  }
});

console.log(`Total projects after merge: ${allProjects.size}`);

// Convert to array format for frontend
const projectsArray = Array.from(allProjects.values());

// Create the frontend DATA structure
const frontendData = {
  meta: {
    title_col: "title",
    summary_col: "summary",
    filter_cols: ["instructor", "client_org_type", "problem_level", "geographic_scope_of_this_applied_policy_project"]
  },
  projects: projectsArray
};

// Save the data
fs.writeFileSync('frontend-data.json', JSON.stringify(frontendData, null, 2));

console.log(`Generated frontend data with ${projectsArray.length} projects`);

// Verify our target project is included
const targetProject = projectsArray.find(p =>
  p.title && p.title.toLowerCase().includes('conversation can save a life')
);

if (targetProject) {
  console.log('\n✅ Target project "A Conversation Can Save a Life" is included:');
  console.log('Title:', targetProject.title);
  console.log('Instructor:', targetProject.instructor);
} else {
  console.log('\n❌ Target project not found in generated data');
}