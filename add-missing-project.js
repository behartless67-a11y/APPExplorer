const fs = require('fs');

// Read the current download index
const downloadIndex = JSON.parse(fs.readFileSync('projects_downloads_index.json', 'utf8'));

// Add the missing project
const projectTitle = 'A Conversation Can Save a Life: Strategies to Reduce Firearm Suicides';
const filename = 'brunnhannah_LATE_1258558_15130802_Brunn_Final_Anna Thomas.pdf';

if (!downloadIndex[projectTitle]) {
  downloadIndex[projectTitle] = `projects/${filename}`;
  console.log('Added project to download index:', projectTitle);
  console.log('File:', filename);
} else {
  console.log('Project already in download index');
}

// Save updated download index
fs.writeFileSync('projects_downloads_index.json', JSON.stringify(downloadIndex, null, 2));

console.log('Total projects with downloads:', Object.keys(downloadIndex).length);

// Verify the project is now in the index
if (downloadIndex[projectTitle]) {
  console.log('✅ Project successfully added to download index');
} else {
  console.log('❌ Failed to add project to download index');
}