const https = require('https');
const fs = require('fs');

// Function to make HTTP request to your Azure Function
function fetchBlobList() {
  return new Promise((resolve, reject) => {
    // Use your deployed Azure Function endpoint
    const options = {
      hostname: 'calm-rock-0599eab0f.1.azurestaticapps.net', // Your Azure Static Web App
      path: '/api/list-all-blobs',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve(result);
        } catch (e) {
          reject(new Error('Failed to parse response: ' + e.message));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function refreshBlobStorage() {
  try {
    console.log('Fetching fresh blob storage inventory from Azure...');

    const response = await fetchBlobList();

    if (response.blobs && Array.isArray(response.blobs)) {
      const blobFiles = response.blobs.map(blob => blob.name);

      console.log(`✅ Retrieved ${blobFiles.length} files from blob storage`);

      // Update our comprehensive storage analysis
      const updatedData = {
        timestamp: new Date().toISOString(),
        source: 'Azure Function API - Fresh fetch',
        sources: {
          azureFileList: {
            files: blobFiles,
            count: blobFiles.length
          }
        }
      };

      // Save updated data
      fs.writeFileSync('data/comprehensive-storage-analysis.json', JSON.stringify(updatedData, null, 2));

      console.log(`📁 Updated blob storage inventory saved`);
      console.log(`📈 Files count: Old: 536 → New: ${blobFiles.length} (+${blobFiles.length - 536})`);

      return blobFiles;

    } else {
      throw new Error('Invalid response format from Azure Function');
    }

  } catch (error) {
    console.error('❌ Error fetching blob storage:', error.message);

    // If API fails, try to manually add the files we know are missing
    console.log('Falling back to manual inventory update...');

    const currentData = JSON.parse(fs.readFileSync('data/comprehensive-storage-analysis.json', 'utf8'));
    const currentFiles = currentData.sources?.azureFileList?.files || [];

    console.log(`Current cached files: ${currentFiles.length}`);
    console.log(`Expected files: 651`);
    console.log(`Missing: ${651 - currentFiles.length}`);

    return currentFiles;
  }
}

refreshBlobStorage().then(files => {
  console.log('✅ Blob storage inventory refresh completed');
}).catch(console.error);