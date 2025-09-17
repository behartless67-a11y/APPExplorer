const fs = require('fs');

// Update our blob storage list with the newly found file
const blobData = JSON.parse(fs.readFileSync('data/comprehensive-storage-analysis.json', 'utf8'));
const blobFiles = blobData.sources?.azureFileList?.files || [];

// Add the missing file to our list
const missingFile = 'brunnhannah_LATE_1258558_15130802_Brunn_Final_Anna Thomas.pdf';

if (!blobFiles.includes(missingFile)) {
  blobFiles.push(missingFile);
  console.log('Added missing file to blob list:', missingFile);

  // Update the data
  blobData.sources.azureFileList.files = blobFiles;
  blobData.sources.azureFileList.count = blobFiles.length;
  blobData.timestamp = new Date().toISOString();

  // Save updated data
  fs.writeFileSync('data/comprehensive-storage-analysis.json', JSON.stringify(blobData, null, 2));
  console.log('Updated blob storage analysis saved');
} else {
  console.log('File already in blob list');
}

console.log('Total blob files now:', blobFiles.length);