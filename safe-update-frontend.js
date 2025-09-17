const fs = require('fs');

// Read the comprehensive frontend data
const newData = JSON.parse(fs.readFileSync('frontend-data.json', 'utf8'));

// Read current app.html
let appHtml = fs.readFileSync('app.html', 'utf8');

// Find the existing DATA constant more precisely
const dataStart = appHtml.indexOf('const DATA = {');
if (dataStart === -1) {
  console.error('Could not find "const DATA = {" in app.html');
  process.exit(1);
}

// Find the end of the DATA object by counting braces
let braceCount = 0;
let dataEnd = -1;
let inString = false;
let escapeNext = false;

for (let i = dataStart + 'const DATA = '.length; i < appHtml.length; i++) {
  const char = appHtml[i];

  if (escapeNext) {
    escapeNext = false;
    continue;
  }

  if (char === '\\') {
    escapeNext = true;
    continue;
  }

  if (char === '"' && !escapeNext) {
    inString = !inString;
    continue;
  }

  if (!inString) {
    if (char === '{') {
      braceCount++;
    } else if (char === '}') {
      braceCount--;
      if (braceCount === 0) {
        dataEnd = i + 1;
        break;
      }
    }
  }
}

if (dataEnd === -1) {
  console.error('Could not find end of DATA object');
  process.exit(1);
}

// Extract before and after sections
const beforeData = appHtml.substring(0, dataStart);
const afterData = appHtml.substring(dataEnd);

// Create the new DATA constant (compact JSON to avoid issues)
const newDataString = `const DATA = ${JSON.stringify(newData)}`;

// Combine everything
const newAppHtml = beforeData + newDataString + afterData;

// Validate the result by checking project count
const projectMatches = newAppHtml.match(/"title":/g);
const expectedProjects = newData.projects.length;

if (projectMatches && projectMatches.length >= expectedProjects) {
  // Write the updated file
  fs.writeFileSync('app.html', newAppHtml);
  console.log(`✅ Successfully updated app.html with ${expectedProjects} projects`);

  // Verify Skyline project is included
  if (newAppHtml.includes('Addressing Chronic Absenteeism At Skyline High School')) {
    console.log('✅ Skyline High School project is now in frontend');
  } else {
    console.log('❌ Skyline High School project still missing');
  }

} else {
  console.error(`❌ Validation failed. Expected ${expectedProjects} projects, found ${projectMatches ? projectMatches.length : 0}`);
  process.exit(1);
}