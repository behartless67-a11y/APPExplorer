const https = require('https');
const fs = require('fs');
const path = require('path');

// Azure Static Web App URL from the documentation
const AZURE_FUNCTION_URL = 'https://calm-rock-0599eab0f.1.azurestaticapps.net/api/test-storage';

async function getCompleteFileList() {
    console.log('=== AZURE BLOB STORAGE COMPLETE INVENTORY ===');
    console.log(`Calling: ${AZURE_FUNCTION_URL}`);
    console.log('');

    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const req = https.request(AZURE_FUNCTION_URL, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Azure-Inventory-Script/1.0'
            }
        }, (res) => {
            let data = '';
            
            console.log(`Response Status: ${res.statusCode}`);
            console.log(`Response Headers:`, res.headers);
            console.log('');

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const duration = Date.now() - startTime;
                console.log(`Request completed in ${duration}ms`);
                console.log('');

                try {
                    const response = JSON.parse(data);
                    
                    if (response.status === 'success') {
                        console.log('✅ Azure Storage Connection Successful!');
                        console.log(`Account: ${response.accountName}`);
                        console.log(`Container: ${response.containerName}`);
                        console.log(`Total Blobs Found: ${response.blobCount}`);
                        console.log('');

                        const blobs = response.blobs || [];
                        
                        // Save complete file list
                        const completeListPath = path.join(__dirname, 'data', 'azure-complete-filelist.json');
                        fs.writeFileSync(completeListPath, JSON.stringify(response, null, 2));
                        console.log(`Complete blob data saved to: ${completeListPath}`);
                        
                        // Create simple text file with just filenames
                        const fileListPath = path.join(__dirname, 'data', 'azure-all-files.txt');
                        const fileNames = blobs.map(blob => blob.name).sort();
                        fs.writeFileSync(fileListPath, fileNames.join('\n'));
                        console.log(`File names list saved to: ${fileListPath}`);
                        
                        // Analysis
                        console.log('');
                        console.log('=== FILE ANALYSIS ===');
                        
                        // Pattern analysis
                        const patterns = {
                            numbered: fileNames.filter(f => /^\d+_/.test(f)),
                            authorNamed: fileNames.filter(f => /^[a-z]+[a-z0-9]*_\d+_\d+_/.test(f)),
                            simple: fileNames.filter(f => /^[A-Za-z][^_]*,\s*[A-Za-z]/.test(f)),
                            other: []
                        };
                        
                        patterns.other = fileNames.filter(f => 
                            !patterns.numbered.includes(f) && 
                            !patterns.authorNamed.includes(f) && 
                            !patterns.simple.includes(f)
                        );
                        
                        console.log(`Files with numbered pattern (###_Name.pdf): ${patterns.numbered.length}`);
                        console.log(`Files with author pattern (lastname_###_###_Title_Instructor.pdf): ${patterns.authorNamed.length}`);
                        console.log(`Files with simple pattern (Lastname, Firstname_Instructor.pdf): ${patterns.simple.length}`);
                        console.log(`Files with other patterns: ${patterns.other.length}`);
                        console.log('');
                        
                        // File type analysis
                        const extensions = {};
                        fileNames.forEach(file => {
                            const ext = path.extname(file).toLowerCase();
                            extensions[ext] = (extensions[ext] || 0) + 1;
                        });
                        
                        console.log('File types:');
                        Object.entries(extensions).forEach(([ext, count]) => {
                            console.log(`  ${ext || '(no extension)'}: ${count} files`);
                        });
                        console.log('');
                        
                        // Compare with current azure-file-list.txt
                        const currentListPath = path.join(__dirname, 'data', 'azure-file-list.txt');
                        if (fs.existsSync(currentListPath)) {
                            const currentList = fs.readFileSync(currentListPath, 'utf8')
                                .split('\n')
                                .map(line => line.trim())
                                .filter(line => line && line.includes('→'))
                                .map(line => line.split('→')[1] || line.trim())
                                .filter(line => line);
                                
                            console.log('=== COMPARISON WITH CURRENT LIST ===');
                            console.log(`Current azure-file-list.txt: ${currentList.length} files`);
                            console.log(`Complete Azure storage: ${fileNames.length} files`);
                            console.log(`Difference: ${fileNames.length - currentList.length} files`);
                            console.log('');
                            
                            // Find missing files
                            const missingFromCurrent = fileNames.filter(f => !currentList.includes(f));
                            const missingFromAzure = currentList.filter(f => !fileNames.includes(f));
                            
                            if (missingFromCurrent.length > 0) {
                                console.log(`Files in Azure but NOT in current list: ${missingFromCurrent.length}`);
                                console.log('First 10 missing files:');
                                missingFromCurrent.slice(0, 10).forEach(f => console.log(`  ${f}`));
                                console.log('');
                                
                                // Save missing files list
                                const missingPath = path.join(__dirname, 'data', 'missing-from-current-list.txt');
                                fs.writeFileSync(missingPath, missingFromCurrent.join('\n'));
                                console.log(`Complete missing files list saved to: ${missingPath}`);
                            }
                            
                            if (missingFromAzure.length > 0) {
                                console.log(`Files in current list but NOT in Azure: ${missingFromAzure.length}`);
                                console.log('First 10:');
                                missingFromAzure.slice(0, 10).forEach(f => console.log(`  ${f}`));
                                console.log('');
                            }
                        }
                        
                        // Check download mapping coverage
                        const mappingPath = path.join(__dirname, 'data', 'download-mapping.json');
                        if (fs.existsSync(mappingPath)) {
                            const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
                            const mappedFiles = Object.values(mapping).map(f => f.replace('projects/', ''));
                            
                            console.log('=== DOWNLOAD MAPPING ANALYSIS ===');
                            console.log(`Projects with download mapping: ${mappedFiles.length}`);
                            console.log(`Files available in Azure: ${fileNames.length}`);
                            
                            const unmappedFiles = fileNames.filter(f => !mappedFiles.includes(f));
                            const mappedButMissing = mappedFiles.filter(f => !fileNames.includes(f));
                            
                            console.log(`Files in Azure but NOT mapped: ${unmappedFiles.length}`);
                            console.log(`Mapped files NOT in Azure: ${mappedButMissing.length}`);
                            console.log('');
                            
                            if (unmappedFiles.length > 0) {
                                console.log('Unmapped files that could be linked to projects:');
                                unmappedFiles.slice(0, 15).forEach(f => console.log(`  ${f}`));
                                console.log('');
                                
                                // Save unmapped files
                                const unmappedPath = path.join(__dirname, 'data', 'unmapped-azure-files.txt');
                                fs.writeFileSync(unmappedPath, unmappedFiles.join('\n'));
                                console.log(`Complete unmapped files list saved to: ${unmappedPath}`);
                            }
                            
                            if (mappedButMissing.length > 0) {
                                console.log('Mapped files missing from Azure:');
                                mappedButMissing.forEach(f => console.log(`  ${f}`));
                                console.log('');
                            }
                        }
                        
                        console.log('=== SUMMARY ===');
                        console.log(`✅ Complete inventory retrieved: ${fileNames.length} files total`);
                        console.log(`✅ Data saved to multiple analysis files`);
                        console.log(`✅ Pattern analysis completed`);
                        console.log(`✅ Comparison with current data completed`);
                        console.log('');
                        console.log('Next steps:');
                        console.log('1. Review unmapped files for potential project matches');
                        console.log('2. Update download-mapping.json with new file discoveries');
                        console.log('3. Consider updating azure-file-list.txt with complete inventory');
                        
                        resolve({
                            success: true,
                            totalFiles: fileNames.length,
                            patterns: patterns,
                            extensions: extensions,
                            files: fileNames
                        });
                        
                    } else {
                        console.log('❌ Azure Storage Connection Failed');
                        console.log('Error:', response.message);
                        console.log('Details:', response.error);
                        reject(new Error(response.message));
                    }
                    
                } catch (parseError) {
                    console.log('❌ Failed to parse response');
                    console.log('Raw response:', data);
                    console.log('Parse error:', parseError.message);
                    reject(parseError);
                }
            });
        });

        req.on('error', (error) => {
            console.log('❌ Request failed:', error.message);
            reject(error);
        });

        req.setTimeout(30000, () => {
            console.log('❌ Request timed out after 30 seconds');
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.end();
    });
}

// Run the inventory
if (require.main === module) {
    getCompleteFileList()
        .then((result) => {
            console.log(`\n🎉 Inventory complete! Found ${result.totalFiles} files total.`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Inventory failed:', error.message);
            process.exit(1);
        });
}

module.exports = { getCompleteFileList };