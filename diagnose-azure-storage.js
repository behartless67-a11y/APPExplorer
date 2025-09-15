const https = require('https');
const fs = require('fs');
const path = require('path');

// Azure Static Web App URLs
const TEST_STORAGE_URL = 'https://calm-rock-0599eab0f.1.azurestaticapps.net/api/test-storage';
const SECURE_DOWNLOAD_URL = 'https://calm-rock-0599eab0f.1.azurestaticapps.net/api/secure-download';

async function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const req = https.request(url, {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Azure-Diagnostic-Script/1.0',
                ...options.headers
            }
        }, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                const duration = Date.now() - startTime;
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    data: data,
                    duration: duration
                });
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (options.body) {
            req.write(options.body);
        }

        req.end();
    });
}

async function diagnoseBlobStorage() {
    console.log('=== AZURE BLOB STORAGE COMPREHENSIVE DIAGNOSIS ===');
    console.log(`Date: ${new Date().toISOString()}`);
    console.log('');

    // Test 1: Call test-storage endpoint
    console.log('🧪 TEST 1: Calling test-storage endpoint...');
    try {
        const response = await makeRequest(TEST_STORAGE_URL);
        console.log(`Status: ${response.status}`);
        console.log(`Duration: ${response.duration}ms`);
        
        let responseData;
        try {
            responseData = JSON.parse(response.data);
            console.log('Response:', JSON.stringify(responseData, null, 2));
            
            if (responseData.blobs && Array.isArray(responseData.blobs)) {
                console.log(`✅ Found ${responseData.blobs.length} blobs`);
                if (responseData.blobs.length > 0) {
                    console.log('First 5 blobs:');
                    responseData.blobs.slice(0, 5).forEach((blob, i) => {
                        console.log(`  ${i+1}. ${blob.name} (${blob.size} bytes)`);
                    });
                }
            } else {
                console.log('❌ No blobs array in response');
            }
        } catch (parseError) {
            console.log('❌ Failed to parse JSON response');
            console.log('Raw response:', response.data);
        }
    } catch (error) {
        console.log('❌ Test-storage request failed:', error.message);
    }
    
    console.log('');
    
    // Test 2: Try secure-download with a known file from the mapping
    console.log('🧪 TEST 2: Testing secure-download with known file...');
    
    // Load a known file from the mapping
    let testFile = null;
    try {
        const mapping = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'download-mapping.json'), 'utf8'));
        const firstEntry = Object.entries(mapping)[0];
        if (firstEntry && firstEntry[1]) {
            testFile = firstEntry[1].replace('projects/', ''); // Remove projects/ prefix
            console.log(`Testing with file: ${testFile}`);
        }
    } catch (error) {
        console.log('❌ Could not load test file from mapping:', error.message);
    }
    
    if (testFile) {
        try {
            const response = await makeRequest(SECURE_DOWNLOAD_URL, {
                method: 'POST',
                headers: {
                    'x-verified-email': 'test@virginia.edu',
                    'x-verification-time': Date.now().toString()
                },
                body: JSON.stringify({ file: testFile })
            });
            
            console.log(`Status: ${response.status}`);
            console.log(`Duration: ${response.duration}ms`);
            
            try {
                const responseData = JSON.parse(response.data);
                console.log('Response:', JSON.stringify(responseData, null, 2));
                
                if (response.status === 200 && responseData.downloadUrl) {
                    console.log('✅ File exists and download URL generated');
                } else if (response.status === 404) {
                    console.log('❌ File not found in Azure storage');
                } else if (response.status === 403) {
                    console.log('⚠️  Access denied (expected for test email)');
                } else {
                    console.log(`⚠️  Unexpected response: ${response.status}`);
                }
            } catch (parseError) {
                console.log('❌ Failed to parse JSON response');
                console.log('Raw response:', response.data);
            }
        } catch (error) {
            console.log('❌ Secure-download request failed:', error.message);
        }
    } else {
        console.log('⚠️  No test file available');
    }
    
    console.log('');
    
    // Test 3: Analyze current file lists
    console.log('🧪 TEST 3: Analyzing existing file data...');
    
    const azureListPath = path.join(__dirname, 'data', 'azure-file-list.txt');
    const mappingPath = path.join(__dirname, 'data', 'download-mapping.json');
    
    let azureFiles = [];
    let mappedFiles = [];
    
    // Load azure file list
    if (fs.existsSync(azureListPath)) {
        const content = fs.readFileSync(azureListPath, 'utf8');
        azureFiles = content.split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.match(/^\s*\d+→/)) // Remove line numbers
            .map(line => line.replace(/^\d+→/, '').trim()) // Clean up format
            .filter(line => line);
        
        console.log(`📄 azure-file-list.txt: ${azureFiles.length} files`);
        console.log('First 3 files:');
        azureFiles.slice(0, 3).forEach((file, i) => {
            console.log(`  ${i+1}. ${file}`);
        });
    } else {
        console.log('❌ azure-file-list.txt not found');
    }
    
    // Load mapping
    if (fs.existsSync(mappingPath)) {
        const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
        mappedFiles = Object.values(mapping).map(f => f.replace('projects/', ''));
        
        console.log(`📄 download-mapping.json: ${mappedFiles.length} files`);
        console.log('First 3 files:');
        mappedFiles.slice(0, 3).forEach((file, i) => {
            console.log(`  ${i+1}. ${file}`);
        });
    } else {
        console.log('❌ download-mapping.json not found');
    }
    
    console.log('');
    
    // Test 4: Pattern analysis
    console.log('🧪 TEST 4: File pattern analysis...');
    
    const allFiles = [...new Set([...azureFiles, ...mappedFiles])]; // Unique files
    console.log(`📊 Total unique files across all sources: ${allFiles.length}`);
    
    const patterns = {
        numbered: allFiles.filter(f => /^\d+_/.test(f)),
        authorNamed: allFiles.filter(f => /^[a-z]+[a-z0-9]*_\d+_\d+_/.test(f)),
        simple: allFiles.filter(f => /^[A-Za-z][^_]*,\s*[A-Za-z]/.test(f)),
        other: []
    };
    
    patterns.other = allFiles.filter(f => 
        !patterns.numbered.includes(f) && 
        !patterns.authorNamed.includes(f) && 
        !patterns.simple.includes(f)
    );
    
    console.log(`📊 Pattern breakdown:`);
    console.log(`  Numbered (###_Name.pdf): ${patterns.numbered.length}`);
    console.log(`  Author-named (lastname_###_###_Title_Instructor.pdf): ${patterns.authorNamed.length}`);
    console.log(`  Simple (Lastname, Firstname_Instructor.pdf): ${patterns.simple.length}`);
    console.log(`  Other patterns: ${patterns.other.length}`);
    
    // File extensions
    const extensions = {};
    allFiles.forEach(file => {
        const ext = path.extname(file).toLowerCase();
        extensions[ext] = (extensions[ext] || 0) + 1;
    });
    
    console.log(`📊 File extensions:`);
    Object.entries(extensions).forEach(([ext, count]) => {
        console.log(`  ${ext || '(no extension)'}: ${count} files`);
    });
    
    console.log('');
    
    // Test 5: Generate comprehensive file list
    console.log('🧪 TEST 5: Generating comprehensive analysis...');
    
    const analysis = {
        timestamp: new Date().toISOString(),
        sources: {
            azureFileList: {
                path: azureListPath,
                exists: fs.existsSync(azureListPath),
                count: azureFiles.length,
                files: azureFiles
            },
            downloadMapping: {
                path: mappingPath,
                exists: fs.existsSync(mappingPath),
                count: mappedFiles.length,
                files: mappedFiles
            }
        },
        analysis: {
            totalUniqueFiles: allFiles.length,
            patterns: patterns,
            extensions: extensions,
            discrepancies: {
                inAzureListButNotMapped: azureFiles.filter(f => !mappedFiles.includes(f)),
                inMappingButNotAzureList: mappedFiles.filter(f => !azureFiles.includes(f))
            }
        },
        recommendations: []
    };
    
    // Generate recommendations
    if (analysis.analysis.discrepancies.inAzureListButNotMapped.length > 0) {
        analysis.recommendations.push({
            type: 'unmapped_files',
            count: analysis.analysis.discrepancies.inAzureListButNotMapped.length,
            message: 'Files exist in azure-file-list.txt but are not mapped to projects'
        });
    }
    
    if (analysis.analysis.discrepancies.inMappingButNotAzureList.length > 0) {
        analysis.recommendations.push({
            type: 'missing_files',
            count: analysis.analysis.discrepancies.inMappingButNotAzureList.length,
            message: 'Files are mapped to projects but not found in azure-file-list.txt'
        });
    }
    
    if (patterns.numbered.length > 0) {
        analysis.recommendations.push({
            type: 'numbered_files',
            count: patterns.numbered.length,
            message: 'Numbered files may contain additional project content'
        });
    }
    
    // Save analysis
    const analysisPath = path.join(__dirname, 'data', 'comprehensive-storage-analysis.json');
    fs.writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
    console.log(`📄 Comprehensive analysis saved to: ${analysisPath}`);
    
    // Create combined file list
    const combinedListPath = path.join(__dirname, 'data', 'all-known-files.txt');
    fs.writeFileSync(combinedListPath, allFiles.sort().join('\n'));
    console.log(`📄 Combined file list saved to: ${combinedListPath}`);
    
    console.log('');
    console.log('=== SUMMARY & RECOMMENDATIONS ===');
    console.log(`📊 Total files identified: ${allFiles.length}`);
    console.log(`📊 Files in azure-file-list.txt: ${azureFiles.length}`);
    console.log(`📊 Files in download-mapping.json: ${mappedFiles.length}`);
    console.log(`📊 Discrepancies found: ${analysis.analysis.discrepancies.inAzureListButNotMapped.length + analysis.analysis.discrepancies.inMappingButNotAzureList.length}`);
    
    console.log('');
    console.log('🎯 Next Steps:');
    analysis.recommendations.forEach((rec, i) => {
        console.log(`${i+1}. ${rec.message} (${rec.count} files)`);
    });
    
    if (analysis.analysis.discrepancies.inAzureListButNotMapped.length > 0) {
        console.log('');
        console.log('📋 Files to investigate (in azure-file-list.txt but not mapped):');
        analysis.analysis.discrepancies.inAzureListButNotMapped.slice(0, 10).forEach(f => {
            console.log(`   ${f}`);
        });
        if (analysis.analysis.discrepancies.inAzureListButNotMapped.length > 10) {
            console.log(`   ... and ${analysis.analysis.discrepancies.inAzureListButNotMapped.length - 10} more`);
        }
    }
    
    return analysis;
}

// Run the diagnosis
if (require.main === module) {
    diagnoseBlobStorage()
        .then((analysis) => {
            console.log(`\n🎉 Diagnosis complete! Found ${analysis.analysis.totalUniqueFiles} total files across all sources.`);
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 Diagnosis failed:', error.message);
            process.exit(1);
        });
}

module.exports = { diagnoseBlobStorage };