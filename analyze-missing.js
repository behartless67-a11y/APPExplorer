const fs = require('fs');

// Load data
const mapping = JSON.parse(fs.readFileSync('data/download-mapping.json', 'utf8'));
const existingFiles = Object.values(mapping);
const data = JSON.parse(fs.readFileSync('app.html', 'utf8').match(/const DATA = ({.*?});/s)[1]);
const missing = data.projects.filter(p => !mapping[p.title]);

console.log('=== FIVE POTENTIAL MATCHES FOR VERIFICATION ===\n');

// Manual analysis of likely matches based on patterns
const suggestions = [
  {
    title: "Increasing Walkability & Bikeability in the City of Charlottesville",
    file: "projects/510_Increasing Black Homeownership in the City of Richmond.pdf",
    confidence: "Low - different topics, similar structure"
  },
  {
    title: "Environmental Justice in Fenceline Communities in Virginia", 
    file: "projects/477_New Growth- Addressing Educational Barriers to Sustainable Agriculture Adoption in Virginia.pdf",
    confidence: "Medium - both Virginia environmental topics"
  },
  {
    title: "Bristol, VA: A Sustainable Recycling Strategy",
    file: "projects/482_Decarbonization of New York City Residential Buildings.pdf", 
    confidence: "Low - both sustainability but different locations"
  },
  {
    title: "Building Bridges with Indigenous Communities",
    file: "projects/emericmartinezchristine_9856_7771644_Heritage_Joshua McCray.pdf",
    confidence: "Medium - heritage/indigenous connection possible"
  },
  {
    title: "Addressing PFAS Contamination in Virginia's Rivers",
    file: "projects/baincaroline_1962_7761163_Caroline_Bain_AP_Emily Anstett.pdf",
    confidence: "Unknown - need to check file content"
  }
];

suggestions.forEach((item, i) => {
  console.log(`${i+1}. MISSING PROJECT:`);
  console.log(`   "${item.title}"`);
  console.log(`   SUGGESTED FILE:`);
  console.log(`   "${item.file}"`);
  console.log(`   CONFIDENCE: ${item.confidence}`);
  console.log();
});

console.log('=== ANALYSIS SUMMARY ===');
console.log(`Total missing projects: ${missing.length}`);
console.log(`Available files in storage: ${existingFiles.length}`);
console.log('\nNOTE: Most files use author names rather than project titles,');
console.log('making automatic matching difficult. Manual verification needed.');