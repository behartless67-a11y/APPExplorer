const fs = require('fs');

// Read the generated frontend data
const newData = JSON.parse(fs.readFileSync('frontend-data.json', 'utf8'));

// Read the current app.html file
let appHtml = fs.readFileSync('app.html', 'utf8');

// Find the DATA constant and replace it
const dataStart = appHtml.indexOf('<script>const DATA = ');
const dataEnd = appHtml.indexOf('</script>', dataStart);

if (dataStart === -1 || dataEnd === -1) {
  console.error('Could not find DATA constant in app.html');
  process.exit(1);
}

// Extract the part before and after the DATA constant
const beforeData = appHtml.substring(0, dataStart);
const afterData = appHtml.substring(dataEnd);

// Create the new DATA constant
const newDataString = `<script>const DATA = ${JSON.stringify(newData, null, 0)};`;

// Combine everything
const newAppHtml = beforeData + newDataString + afterData;

// Write the updated file
fs.writeFileSync('app.html', newAppHtml);

console.log(`✅ Updated app.html with ${newData.projects.length} projects`);

// Verify the target project is in the new data
const targetProject = newData.projects.find(p =>
  p.title && p.title.toLowerCase().includes('conversation can save a life')
);

if (targetProject) {
  console.log('✅ "A Conversation Can Save a Life" is now in frontend data');
  console.log('Title:', targetProject.title);
} else {
  console.log('❌ Target project missing from updated data');
}