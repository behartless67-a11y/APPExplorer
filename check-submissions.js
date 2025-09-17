const { BlobServiceClient } = require('@azure/storage-blob');

async function checkRecentSubmissions() {
    try {
        // Azure Storage configuration
        const accountName = 'projectexplorerfiles';
        const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || 'your-key-here';
        const containerName = 'project-files';

        if (!accountKey || accountKey === 'your-key-here') {
            console.log('❌ Azure Storage account key not configured');
            console.log('Set AZURE_STORAGE_ACCOUNT_KEY environment variable');
            return;
        }

        console.log('🔍 Checking for recent submissions...');
        console.log(`Account: ${accountName}`);
        console.log(`Container: ${containerName}`);

        const blobServiceClient = BlobServiceClient.fromConnectionString(
            `DefaultEndpointsProtocol=https;AccountName=${accountName};AccountKey=${accountKey};EndpointSuffix=core.windows.net`
        );
        const containerClient = blobServiceClient.getContainerClient(containerName);

        // List recent submissions (within last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentFiles = [];
        const recentMetadata = [];

        console.log(`\n📅 Looking for files uploaded after: ${oneHourAgo.toISOString()}`);

        // Scan for recent files and metadata
        for await (const blob of containerClient.listBlobsFlat()) {
            const lastModified = new Date(blob.properties.lastModified);

            if (lastModified > oneHourAgo) {
                if (blob.name.startsWith('submissions/') && blob.name.endsWith('_metadata.json')) {
                    recentMetadata.push({
                        name: blob.name,
                        lastModified: lastModified,
                        size: blob.properties.contentLength
                    });
                } else if (blob.name.startsWith('projects/') && !blob.name.includes('projects/submitted/')) {
                    // New project files (not in submitted folder)
                    recentFiles.push({
                        name: blob.name,
                        lastModified: lastModified,
                        size: blob.properties.contentLength
                    });
                }
            }
        }

        console.log(`\n📊 SCAN RESULTS:`);
        console.log(`Recent project files: ${recentFiles.length}`);
        console.log(`Recent metadata files: ${recentMetadata.length}`);

        // Show recent project files
        if (recentFiles.length > 0) {
            console.log(`\n📁 RECENT PROJECT FILES:`);
            recentFiles.forEach((file, i) => {
                console.log(`${i + 1}. ${file.name}`);
                console.log(`   📅 Uploaded: ${file.lastModified.toISOString()}`);
                console.log(`   📏 Size: ${(file.size / 1024).toFixed(1)} KB`);
                console.log('');
            });
        }

        // Show and read recent metadata
        if (recentMetadata.length > 0) {
            console.log(`\n📋 RECENT SUBMISSIONS:`);

            for (const metadata of recentMetadata) {
                console.log(`📄 ${metadata.name}`);
                console.log(`📅 Submitted: ${metadata.lastModified.toISOString()}`);

                try {
                    // Download and parse metadata
                    const blobClient = containerClient.getBlobClient(metadata.name);
                    const downloadResponse = await blobClient.download();
                    const metadataContent = await streamToText(downloadResponse.readableStreamBody);
                    const submissionData = JSON.parse(metadataContent);

                    console.log(`📝 Title: ${submissionData.title}`);
                    console.log(`👤 Student: ${submissionData.studentName}`);
                    console.log(`👨‍🏫 Instructor: ${submissionData.instructor}`);
                    console.log(`📂 Files: ${submissionData.uploadedFiles?.length || 0}`);
                    console.log(`🆔 Submission ID: ${submissionData.submissionId}`);

                    if (submissionData.uploadedFiles && submissionData.uploadedFiles.length > 0) {
                        console.log(`📎 Uploaded Files:`);
                        submissionData.uploadedFiles.forEach(file => {
                            console.log(`   - ${file.originalName} (${(file.size / 1024).toFixed(1)} KB)`);
                        });
                    }

                } catch (parseError) {
                    console.log(`❌ Error reading metadata: ${parseError.message}`);
                }

                console.log('─'.repeat(60));
            }
        }

        if (recentFiles.length === 0 && recentMetadata.length === 0) {
            console.log('\n💭 No recent submissions found within the last hour.');
            console.log('💡 Try submitting again, or check if the upload succeeded.');
        }

    } catch (error) {
        console.error('❌ Error checking submissions:', error.message);
    }
}

// Helper function to convert stream to text
async function streamToText(readableStream) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        readableStream.on('data', (data) => {
            chunks.push(data.toString());
        });
        readableStream.on('end', () => {
            resolve(chunks.join(''));
        });
        readableStream.on('error', reject);
    });
}

// Run the check
checkRecentSubmissions();