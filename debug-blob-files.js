const fs = require('fs');
const blobData = JSON.parse(fs.readFileSync('data/comprehensive-storage-analysis.json', 'utf8'));
const blobFiles = blobData.sources?.azureFileList?.files || [];

console.log(`Total blob files: ${blobFiles.length}`);
console.log('\nFirst 10 blob files:');
blobFiles.slice(0, 10).forEach((file, i) => {
  console.log(`${i+1}. ${file}`);
});

console.log('\nLooking for specific files we expect:');
const testFiles = [
  'brunnhannah_LATE_1258558_15130802_Brunn_Final_Anna Thomas.pdf',
  'geithclaire_990427_14518072_Claire Geith APP_Anna Thomas.pdf'
];

testFiles.forEach(testFile => {
  const found = blobFiles.includes(testFile);
  console.log(`${testFile}: ${found ? 'FOUND' : 'NOT FOUND'}`);
});