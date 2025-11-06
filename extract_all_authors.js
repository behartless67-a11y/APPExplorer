const { execSync } = require('child_process');
const fs = require('fs');

console.log('Starting author extraction for all PDFs...\n');

// Get all PDF files
const allPdfs = execSync('find ./files -name "*.pdf" -type f', { encoding: 'utf8' })
    .split('\n')
    .filter(f => f.trim().length > 0);

console.log(`Found ${allPdfs.length} PDF files to process\n`);

const results = [];
let successCount = 0;
let notFoundCount = 0;
let errorCount = 0;

const excludeWords = /(photo|disclaimer|acknowledgment|prepared for|school|university|virginia|policy|project|report|batten|may|april|june|january|february|march|july|august|september|october|november|december|20\d{2}|\d{4}|technical|applied|honou?r)/i;

allPdfs.forEach((file, index) => {
    const basename = file.split('/').pop();

    // Progress indicator every 50 files
    if ((index + 1) % 50 === 0) {
        console.log(`Progress: ${index + 1}/${allPdfs.length} files processed...`);
    }

    try {
        const text = execSync(`pdftotext -l 1 "${file}" - 2>&1`, { encoding: 'utf8', timeout: 10000 });
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        let author = null;
        let pattern = null;

        // Pattern 1: Name with Master of Public Policy
        for (let i = 0; i < lines.length; i++) {
            if (/Master of Public Policy/i.test(lines[i])) {
                const words = lines[i].split(/\s+/);
                const mppIndex = words.findIndex(w => /master/i.test(w));
                if (mppIndex > 0) {
                    const potentialName = words.slice(0, mppIndex).join(' ');
                    if (potentialName.length > 5 && potentialName.length < 50 &&
                        /^[A-Z]/.test(potentialName) &&
                        !excludeWords.test(potentialName)) {
                        author = potentialName;
                        pattern = 'WITH_MPP';
                        break;
                    }
                }
                if (i > 0 && lines[i-1] && lines[i-1].length > 5 && lines[i-1].length < 50 &&
                    /^[A-Z]/.test(lines[i-1]) && !excludeWords.test(lines[i-1])) {
                    author = lines[i-1];
                    pattern = 'BEFORE_MPP';
                    break;
                }
            }
        }

        // Pattern 2: ALL CAPS name (2-4 words)
        if (!author) {
            for (let i = 0; i < lines.length; i++) {
                if (/^[A-Z][A-Z\s\.]{5,48}[A-Z]$/.test(lines[i]) &&
                    !excludeWords.test(lines[i])) {
                    const wordCount = lines[i].split(/\s+/).length;
                    if (wordCount >= 2 && wordCount <= 4) {
                        author = lines[i];
                        pattern = 'ALL_CAPS';
                        break;
                    }
                }
            }
        }

        // Pattern 3: Name before Batten/UVA (within 3 lines)
        if (!author) {
            for (let i = 0; i < lines.length; i++) {
                if (/Frank Batten School|University of Virginia/i.test(lines[i])) {
                    for (let j = Math.max(0, i-3); j < i; j++) {
                        const checkLine = lines[j];
                        if (checkLine && checkLine.length > 5 && checkLine.length < 50 &&
                            /^[A-Z]/.test(checkLine) &&
                            !excludeWords.test(checkLine) &&
                            !/^(the|towards|improving|addressing|a |an )/i.test(checkLine)) {
                            const wordCount = checkLine.split(/\s+/).length;
                            if (wordCount >= 2 && wordCount <= 4) {
                                author = checkLine;
                                pattern = 'BEFORE_INSTITUTION';
                                break;
                            }
                        }
                    }
                    if (author) break;
                }
            }
        }

        // Pattern 4: After Prepared by
        if (!author) {
            for (let i = 0; i < lines.length - 1; i++) {
                if (/(prepared by|^by:?$)/i.test(lines[i])) {
                    const nextLine = lines[i+1];
                    if (nextLine && nextLine.length > 5 && nextLine.length < 50 &&
                        /^[A-Z]/.test(nextLine) && !excludeWords.test(nextLine)) {
                        author = nextLine;
                        pattern = 'PREPARED_BY';
                        break;
                    }
                }
            }
        }

        if (author) {
            successCount++;
        } else {
            notFoundCount++;
        }

        results.push({
            filename: basename,
            author: author,
            pattern: pattern,
            status: author ? 'success' : 'not_found'
        });

    } catch (error) {
        errorCount++;
        results.push({
            filename: basename,
            author: null,
            pattern: null,
            status: 'error',
            error: error.message
        });
    }
});

console.log('\n=== EXTRACTION COMPLETE ===');
console.log(`Total files processed: ${allPdfs.length}`);
console.log(`Authors extracted: ${successCount} (${Math.round(successCount/allPdfs.length*100)}%)`);
console.log(`Not found: ${notFoundCount} (${Math.round(notFoundCount/allPdfs.length*100)}%)`);
console.log(`Errors: ${errorCount}`);
console.log('');

// Save as JSON
const jsonOutput = {
    metadata: {
        total_files: allPdfs.length,
        extracted: successCount,
        not_found: notFoundCount,
        errors: errorCount,
        extraction_date: new Date().toISOString(),
        success_rate: `${Math.round(successCount/allPdfs.length*100)}%`
    },
    authors: results
};

fs.writeFileSync('student-authors.json', JSON.stringify(jsonOutput, null, 2));
console.log('✅ JSON saved to: student-authors.json');

// Save as CSV
const csvLines = ['Filename,Student Author,Extraction Pattern,Status'];
results.forEach(r => {
    const author = r.author ? `"${r.author.replace(/"/g, '""')}"` : '';
    csvLines.push(`"${r.filename}",${author},${r.pattern || ''},${r.status}`);
});
fs.writeFileSync('student-authors.csv', csvLines.join('\n'));
console.log('✅ CSV saved to: student-authors.csv');

// Create summary of NOT FOUND files for manual review
const notFoundFiles = results.filter(r => r.status === 'not_found');
fs.writeFileSync('authors-not-found.txt', notFoundFiles.map(r => r.filename).join('\n'));
console.log(`✅ Not found list saved to: authors-not-found.txt (${notFoundFiles.length} files)`);

console.log('\n=== FILES READY FOR REVIEW ===');
console.log('You can now:');
console.log('1. Open student-authors.csv in Excel to review/correct');
console.log('2. Use student-authors.json to integrate with your search system');
console.log('3. Manually review authors-not-found.txt for missing extractions');
