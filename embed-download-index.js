const fs = require('fs');

// Read the download index
const downloadIndex = JSON.parse(fs.readFileSync('projects_downloads_index.json', 'utf8'));

// Read the current app.html
let appHtml = fs.readFileSync('app.html', 'utf8');

// Find where to inject the embedded download index
const scriptStart = appHtml.indexOf('window.addEventListener("DOMContentLoaded", init);');

if (scriptStart === -1) {
  console.error('Could not find DOMContentLoaded event listener');
  process.exit(1);
}

// Create the embedded download index
const embedScript = `
  // Embedded download index to avoid fetch issues
  window.DOWNLOAD_INDEX = ${JSON.stringify(downloadIndex)};

  window.addEventListener("DOMContentLoaded", init);`;

// Replace the DOMContentLoaded line with our embedded version
const newAppHtml = appHtml.replace(
  'window.addEventListener("DOMContentLoaded", init);',
  embedScript
);

// Write the updated file
fs.writeFileSync('app.html', newAppHtml);

console.log(`✅ Embedded download index with ${Object.keys(downloadIndex).length} projects directly in HTML`);
console.log('This bypasses any fetch issues and should make download buttons appear immediately');

// Verify Skyline project is in the embedded index
if (downloadIndex['Addressing Chronic Absenteeism At Skyline High School']) {
  console.log('✅ Skyline High School project is in embedded download index');
} else {
  console.log('❌ Skyline High School project missing from download index');
}