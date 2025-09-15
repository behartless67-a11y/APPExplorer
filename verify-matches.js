// Script to test download URLs for the 5 potential matches
const https = require('https');
const fs = require('fs');

const testMatches = [
  {
    title: "Increasing Walkability & Bikeability in the City of Charlottesville",
    file: "projects/510_Increasing Black Homeownership in the City of Richmond.pdf"
  },
  {
    title: "Environmental Justice in Fenceline Communities in Virginia", 
    file: "projects/477_New Growth- Addressing Educational Barriers to Sustainable Agriculture Adoption in Virginia.pdf"
  },
  {
    title: "Building Bridges with Indigenous Communities",
    file: "projects/emericmartinezchristine_9856_7771644_Heritage_Joshua McCray.pdf"
  },
  {
    title: "Bristol, VA: A Sustainable Recycling Strategy",
    file: "projects/482_Decarbonization of New York City Residential Buildings.pdf"
  },
  {
    title: "Addressing PFAS Contamination in Virginia's Rivers",
    file: "projects/baincaroline_1962_7761163_Caroline_Bain_AP_Emily Anstett.pdf"
  }
];

async function testDownload(filename) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ file: filename });
    
    const options = {
      hostname: 'calm-rock-0599eab0f.1.azurestaticapps.net',
      path: '/api/secure-download',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('=== TESTING 5 POTENTIAL MATCHES ===\n');
  
  for (let i = 0; i < testMatches.length; i++) {
    const match = testMatches[i];
    console.log(`${i+1}. Testing: "${match.title}"`);
    console.log(`   File: "${match.file}"`);
    
    try {
      const result = await testDownload(match.file);
      if (result.status === 200 && result.data.downloadUrl) {
        console.log(`   ✅ DOWNLOAD AVAILABLE`);
        console.log(`   📄 Download URL generated successfully`);
        console.log(`   🔗 You can now manually check this file's first page`);
      } else {
        console.log(`   ❌ DOWNLOAD FAILED`);
        console.log(`   Status: ${result.status}`);
        console.log(`   Response: ${JSON.stringify(result.data)}`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
    console.log();
  }
  
  console.log('=== NEXT STEPS ===');
  console.log('For files that downloaded successfully:');
  console.log('1. Download the PDF from the generated URL');
  console.log('2. Check the first page for the actual project title');
  console.log('3. Compare with the missing project title');
  console.log('4. If they match, we can add to download mapping!');
}

main().catch(console.error);