/**
 * Extract project data from APPLibrary.xlsx and generate download mapping
 */
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_FILE = path.resolve('APPLibrary.xlsx');
const OUTPUT_FILE = path.resolve('data/projects.json');
const DOWNLOAD_MAPPING_FILE = path.resolve('data/download-mapping.json');

function main() {
  try {
    console.log('Reading Excel file:', EXCEL_FILE);
    
    if (!fs.existsSync(EXCEL_FILE)) {
      console.error('Excel file not found:', EXCEL_FILE);
      process.exit(1);
    }

    // Read the Excel file
    const workbook = XLSX.readFile(EXCEL_FILE);
    const sheetNames = workbook.SheetNames;
    console.log('Available sheets:', sheetNames);
    
    // Use the first sheet
    const sheetName = sheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    console.log(`Found ${rawData.length} rows of data`);
    
    if (rawData.length > 0) {
      console.log('Sample row keys:', Object.keys(rawData[0]));
      console.log('First few rows:');
      rawData.slice(0, 3).forEach((row, idx) => {
        console.log(`Row ${idx}:`, row);
      });
    }
    
    // Process the data to extract projects and download mapping
    const projects = [];
    const downloadMapping = {};
    
    rawData.forEach((row, index) => {
      // Based on the actual Excel structure we found
      const projectTitle = row['Project Name'] || '';
      const filename = row['Name'] || '';
      const instructor = row['Instructor'] || '';
      const startTerm = row['Project_Start_Term'] || '';
      
      // Extract year from start term if available
      const year = startTerm.match(/\d{4}/) ? startTerm.match(/\d{4}/)[0] : '';
      
      let foundTitle = projectTitle.trim();
      let foundFilename = filename.trim();
      
      if (foundTitle && foundTitle.trim()) {
        const project = {
          id: `proj-${String(index + 1).padStart(3, '0')}`,
          project_title: foundTitle.trim(),
          instructor: instructor || '',
          year: year || '',
          problem_level: 'Unknown',
          source_url: foundFilename ? `azure://project-files/${foundFilename.trim()}` : '',
          text: `Project: ${foundTitle.trim()}${instructor ? ` by ${instructor}` : ''}${year ? ` (${year})` : ''}`
        };
        
        projects.push(project);
        
        // Add to download mapping if we have both title and filename
        if (foundFilename && foundFilename.trim()) {
          downloadMapping[foundTitle.trim()] = foundFilename.trim();
        }
        
        console.log(`Processed: ${foundTitle} -> ${foundFilename || 'NO FILE'}`);
      }
    });
    
    console.log(`\nProcessed ${projects.length} projects`);
    console.log(`Found ${Object.keys(downloadMapping).length} download mappings`);
    
    // Write projects.json
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(projects, null, 2));
    console.log('Written:', OUTPUT_FILE);
    
    // Write download mapping
    fs.writeFileSync(DOWNLOAD_MAPPING_FILE, JSON.stringify(downloadMapping, null, 2));
    console.log('Written:', DOWNLOAD_MAPPING_FILE);
    
    // Show some sample mappings
    console.log('\nSample download mappings:');
    const sampleKeys = Object.keys(downloadMapping).slice(0, 5);
    sampleKeys.forEach(key => {
      console.log(`  "${key}" -> "${downloadMapping[key]}"`);
    });
    
  } catch (error) {
    console.error('Error processing Excel file:', error);
    process.exit(1);
  }
}

main();