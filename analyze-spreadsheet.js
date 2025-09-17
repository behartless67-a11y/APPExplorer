const XLSX = require('xlsx');
const path = require('path');

const workbook = XLSX.readFile('../FixedAPPLibraryMapping.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet);

console.log('Total projects in spreadsheet:', data.length);
console.log('\nSheet columns:', Object.keys(data[0] || {}));

console.log('\nFirst 5 projects:');
data.slice(0, 5).forEach((row, i) => {
  const title = row['Project Title'] || row['Title'] || Object.values(row)[0];
  console.log(`${i+1}. ${title}`);
});

console.log('\nLooking for "A Conversation Can Save a Life"...');
const targetProject = data.find(row =>
  Object.values(row).some(val =>
    val && val.toString().toLowerCase().includes('conversation can save a life')
  )
);

if (targetProject) {
  console.log('\nFound project:');
  console.log(JSON.stringify(targetProject, null, 2));
} else {
  console.log('\nProject not found, searching for partial matches...');
  const matches = data.filter(row =>
    Object.values(row).some(val =>
      val && val.toString().toLowerCase().includes('conversation')
    )
  );
  console.log('Conversation matches:', matches.length);
  matches.forEach(match => {
    const title = match['Project Title'] || match['Title'] || Object.values(match)[0];
    console.log('- ' + title);
  });
}