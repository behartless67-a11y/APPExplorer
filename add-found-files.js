const fs = require('fs');

// Files you confirmed are in blob storage
const foundFiles = [
  '407_Lettie Bien APP 2019.pdf',
  '379_College Advising Corps.pdf',
  '367_Sexual Assault Resource Agency.pdf',
  '294_APP 2018 Theodore En-Dao Fergusson.pdf',
  'geithclaire_990427_14518072_Claire Geith APP_Anna Thomas.pdf'
];

// Read current blob storage data
const currentData = JSON.parse(fs.readFileSync('data/comprehensive-storage-analysis.json', 'utf8'));
const currentBlobs = currentData.sources?.azureFileList?.files || [];

console.log(`Current blob inventory has ${currentBlobs.length} files`);

let addedCount = 0;

// Add the found files to the inventory
foundFiles.forEach(file => {
  if (!currentBlobs.includes(file)) {
    currentBlobs.push(file);
    addedCount++;
    console.log(`+ Added: ${file}`);
  } else {
    console.log(`  Already present: ${file}`);
  }
});

if (addedCount > 0) {
  // Update the data
  currentData.sources.azureFileList.files = currentBlobs;
  currentData.sources.azureFileList.count = currentBlobs.length;
  currentData.timestamp = new Date().toISOString();

  // Save updated data
  fs.writeFileSync('data/comprehensive-storage-analysis.json', JSON.stringify(currentData, null, 2));

  console.log(`\nUpdated blob inventory: ${currentBlobs.length} total files (+${addedCount})`);
} else {
  console.log('\nNo new files added - all were already in inventory');
}

console.log(`Files added: ${addedCount}`);