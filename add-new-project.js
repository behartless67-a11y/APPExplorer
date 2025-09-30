const fs = require('fs');

// Read the submission data from our API response
const newProjectData = {
  "title": "Girls on the Run: Bridging the Coaching Gap",
  "summary": "This project addresses the coaching gap in Girls on the Run programming to improve program quality and participant outcomes. The analysis examines current coaching challenges and proposes evidence-based solutions to strengthen the organization's volunteer coach training and support systems.",
  "instructor": "Justice Demby's Instructor", // We can update this if we have the actual instructor
  "client_org_type": "Nonprofit Sector",
  "problem_level": "National",
  "geographic_scope_of_this_applied_policy_project": "Domestic",
  "student_name": "Justice Demby",
  "submission_id": "SUB_1758129096585_j54377hf9",
  "submitted_at": "2025-09-17T17:11:36.585Z",
  "file_name": "projects/JusticeDemby_SUB_1758129096585_j54377hf9_Demby_APP.pdf"
};

console.log('Adding new project to APP Explorer...');
console.log(`Title: ${newProjectData.title}`);
console.log(`Student: ${newProjectData.student_name}`);
console.log(`File: ${newProjectData.file_name}`);

try {
  // Read the current app.html file
  const appHtml = fs.readFileSync('app.html', 'utf8');

  // Find the DATA object
  const dataStart = appHtml.indexOf('const DATA = {');
  if (dataStart === -1) {
    throw new Error('Could not find DATA object in app.html');
  }

  // Find the projects array within DATA
  const projectsStart = appHtml.indexOf('"projects":[', dataStart);
  if (projectsStart === -1) {
    throw new Error('Could not find projects array in DATA object');
  }

  // Find the first project to insert before it
  const firstProjectStart = appHtml.indexOf('{"title":', projectsStart);
  if (firstProjectStart === -1) {
    throw new Error('Could not find first project in array');
  }

  // Create the new project object
  const newProject = {
    "title": newProjectData.title,
    "summary": newProjectData.summary,
    "instructor": newProjectData.instructor,
    "client_org_type": newProjectData.client_org_type,
    "problem_level": newProjectData.problem_level,
    "geographic_scope_of_this_applied_policy_project": newProjectData.geographic_scope_of_this_applied_policy_project
  };

  const newProjectJson = JSON.stringify(newProject) + ',';

  // Insert the new project at the beginning of the projects array
  const beforeProjects = appHtml.substring(0, firstProjectStart);
  const afterProjects = appHtml.substring(firstProjectStart);
  const updatedHtml = beforeProjects + newProjectJson + afterProjects;

  // Now update the download index
  const downloadIndexStart = updatedHtml.indexOf('window.DOWNLOAD_INDEX = {');
  if (downloadIndexStart === -1) {
    throw new Error('Could not find DOWNLOAD_INDEX in app.html');
  }

  const downloadIndexEnd = updatedHtml.indexOf('};', downloadIndexStart);
  if (downloadIndexEnd === -1) {
    throw new Error('Could not find end of DOWNLOAD_INDEX');
  }

  // Extract the current download index
  const downloadIndexStr = updatedHtml.substring(downloadIndexStart + 'window.DOWNLOAD_INDEX = '.length, downloadIndexEnd + 1);
  const downloadIndex = JSON.parse(downloadIndexStr);

  // Add the new project to the download index
  downloadIndex[newProjectData.title] = newProjectData.file_name;

  // Create the updated download index string
  const newDownloadIndexStr = 'window.DOWNLOAD_INDEX = ' + JSON.stringify(downloadIndex, null, 0);

  // Replace the download index in the HTML
  const beforeDownloadIndex = updatedHtml.substring(0, downloadIndexStart);
  const afterDownloadIndex = updatedHtml.substring(downloadIndexEnd + 2); // +2 for "};"
  const finalHtml = beforeDownloadIndex + newDownloadIndexStr + ';\n\n  ' + afterDownloadIndex;

  // Write the updated file
  fs.writeFileSync('app.html', finalHtml);

  console.log('✅ Successfully added project to app.html');
  console.log(`✅ Added to download index: "${newProjectData.title}" -> "${newProjectData.file_name}"`);
  console.log(`✅ Total projects now: ${Object.keys(downloadIndex).length}`);

  // Also update the projects_downloads_index.json file
  let projectsDownloadIndex = {};
  try {
    projectsDownloadIndex = JSON.parse(fs.readFileSync('projects_downloads_index.json', 'utf8'));
  } catch (e) {
    console.log('Note: Could not read projects_downloads_index.json, creating new one');
  }

  projectsDownloadIndex[newProjectData.title] = newProjectData.file_name;
  fs.writeFileSync('projects_downloads_index.json', JSON.stringify(projectsDownloadIndex, null, 2));

  console.log('✅ Updated projects_downloads_index.json');
  console.log('\n🎉 Project "Girls on the Run: Bridging the Coaching Gap" has been added!');
  console.log('📊 It will now appear in the main explorer with full download functionality.');

} catch (error) {
  console.error('❌ Error adding project:', error.message);
  process.exit(1);
}