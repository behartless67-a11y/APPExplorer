/**
 * Test filename encoding for the "Driving" project
 */
const fs = require('fs');
const path = require('path');

const DOWNLOAD_MAPPING_FILE = path.resolve('data/download-mapping.json');

function main() {
  try {
    const downloadMapping = JSON.parse(fs.readFileSync(DOWNLOAD_MAPPING_FILE, 'utf8'));
    
    // Test the specific project
    const searchTerms = [
      '"Driving" Electric Vehicle Adoption in Rhode Island',
      'Driving Electric Vehicle Adoption in Rhode Island',
      '"Driving" Electric Vehicle Adoption in Rhode Island',
      '"Driving" Electric Vehicle Adoption in Rhode Island'
    ];
    
    console.log('=== TESTING FILENAME ENCODING ===\n');
    
    searchTerms.forEach(term => {
      console.log(`Testing: "${term}"`);
      if (downloadMapping[term]) {
        console.log(`✅ FOUND: ${downloadMapping[term]}`);
        console.log(`   Encoded: ${encodeURIComponent(downloadMapping[term])}`);
      } else {
        console.log(`❌ NOT FOUND`);
      }
      console.log('');
    });
    
    // Show all keys that contain "Driving"
    console.log('=== ALL KEYS CONTAINING "DRIVING" ===');
    Object.keys(downloadMapping).filter(key => 
      key.toLowerCase().includes('driving')
    ).forEach(key => {
      console.log(`"${key}" -> "${downloadMapping[key]}"`);
    });
    
    // Show exact character codes for the key
    const drivingKeys = Object.keys(downloadMapping).filter(key => 
      key.toLowerCase().includes('driving')
    );
    
    if (drivingKeys.length > 0) {
      const key = drivingKeys[0];
      console.log(`\n=== CHARACTER ANALYSIS FOR: ${key} ===`);
      for (let i = 0; i < key.length; i++) {
        const char = key[i];
        const code = char.charCodeAt(0);
        if (char === '"' || char === '"' || char === '"' || code > 127) {
          console.log(`Position ${i}: "${char}" (code: ${code}) ${code > 127 ? '*** NON-ASCII ***' : ''}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();