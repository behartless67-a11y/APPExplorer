# Student Author Extraction Project

## Overview

This document describes the automated student author extraction process implemented to enable searching for student projects by student name. Currently, the APPExplorer system only allows searching by project title, instructor, and other metadata - but not by the student who authored the project.

## Problem Statement

A student inquired about finding projects authored by specific students:
1. Kalista Pepper
2. Hannah Quinn
3. Jaynae Wright
4. Jen Donovan
5. Jamie Shelton
6. Anastasia Jones Burdick

### Search Results

**Found in System (3/6):**
- ✅ Hannah Quinn (as "Feeney, Quinn") - `Feeney, Quinn_Morgan Berry.pdf`
- ✅ Kalista Pepper - `pepperkalista_384924_14494025_Technical Repor_Morgan Berry.pdf`
- ✅ Anastasia Jones Burdick - `jonesburdickanastasia_1256759_14518623_APPFin_Carson Crenshaw.pdf`

**Not Found (3/6):**
- ❌ Jaynae Wright - No project found in any data source
- ❌ Jen Donovan - No project found (Megan Donovan found but as client org contact, not student)
- ❌ Jamie Shelton - No project found in any data source

### Key Finding

**Student names are NOT stored in metadata.** They only appear:
- In filenames (sometimes)
- In the PDF content itself (first 1-2 pages)
- In email field of APPLibrary.xlsx (for some projects)

Azure blob storage contains NO custom metadata fields for student names.

## Solution: Automated PDF Extraction

### Approach

Extract student names from the first page of each PDF by looking for common patterns where student names appear.

### Extraction Patterns (Priority Order)

1. **Pattern 1: WITH_MPP / BEFORE_MPP**
   - Name appearing with "Master of Public Policy"
   - Example: "Allison Brown Master of Public Policy Candidate"
   - Most reliable pattern

2. **Pattern 2: ALL_CAPS**
   - Student name in all capital letters (2-4 words)
   - Example: "RAMYA RAVICHANDRAN"
   - Common in older reports

3. **Pattern 3: BEFORE_INSTITUTION**
   - Name appearing within 3 lines before "Frank Batten School" or "University of Virginia"
   - Example: "Michael Jarosz" before "Frank Batten School..."
   - Handles various formatting styles

4. **Pattern 4: PREPARED_BY**
   - Name following "Prepared by:" or "By:"
   - Less common but still used

### Exclusion Filters

To avoid false positives, the following are excluded:
- Words containing: photo, disclaimer, acknowledgment, school, university, virginia, policy, project, report, batten, month names, years (20XX)
- Project titles starting with: the, towards, improving, addressing, a, an
- Lines that are too short (<5 chars) or too long (>50 chars)
- Lines that don't start with a capital letter
- Lines with fewer than 2 words or more than 4 words

## Results

### Extraction Statistics

- **Total PDFs processed:** 637
- **Authors successfully extracted:** 252 (40%)
- **Not found:** 367 (58%)
- **Errors:** 18 (3%)

### Output Files

1. **`student-authors.json`** - JSON format for system integration
   - Contains extraction metadata (date, success rate, totals)
   - Array of all files with: filename, author, pattern, status
   - **Recommended format for search integration**

2. **`student-authors.csv`** - CSV for manual review/correction
   - Easy to open in Excel
   - Can be edited to correct false positives
   - Columns: Filename, Student Author, Extraction Pattern, Status

3. **`authors-not-found.txt`** - List of 367 files needing manual review
   - Files where automatic extraction failed
   - Can be manually reviewed and added to the dataset

4. **`extract_all_authors.js`** - Extraction script
   - Node.js script that processes all PDFs
   - Can be re-run if PDFs are updated
   - Configurable patterns and filters

### Sample Successful Extractions

```
001_Ramya Ravichandran APP 2019.pdf → RAMYA RAVICHANDRAN (ALL_CAPS)
002_Maria Loverde APP 2019.pdf → Maria Loverde (WITH_MPP)
230_mmj2jm APP 2020.pdf → Michael Jarosz (BEFORE_INSTITUTION)
119_APP 2021 (45).pdf → Allison Brown (WITH_MPP)
```

### Known Issues

**False Positives** - Some project titles were incorrectly extracted as author names:
- "VIOLENCE AT THE BORDER" (project title, not a person)
- "BUILDING BETTER BAG BEHAVIORS" (project title, not a person)

**Recommendation:** Manual review of `student-authors.csv` to identify and correct false positives.

## Files Created/Modified

### New Files
- `student-authors.json` - Main author database (JSON)
- `student-authors.csv` - Author database (CSV for review)
- `authors-not-found.txt` - List of files needing manual extraction
- `extract_all_authors.js` - Extraction script
- `extract_author_test.js` - Testing script (can be deleted)
- `STUDENT_AUTHOR_EXTRACTION.md` - This documentation

### Not Modified
- No changes to live site files (`app.html`, `frontend-data.json`, etc.)
- No changes to Azure blob storage
- No changes to deployment configuration

## Next Steps (Future Work)

### 1. Data Cleanup
- [ ] Open `student-authors.csv` in Excel
- [ ] Review and correct false positives
- [ ] Manually add authors for high-priority "not found" files
- [ ] Re-export cleaned data as JSON

### 2. Integration with Search System

**Option A: Merge into frontend-data.json**
- Add `student_author` field to each project in `frontend-data.json`
- Match by filename or project title
- Requires regenerating frontend data

**Option B: Separate Author Lookup**
- Keep `student-authors.json` as separate lookup table
- Frontend searches both project data AND author data
- Easier to maintain and update

**Option C: Add to Search Index**
- If using server-side search or search index
- Index student names alongside project titles
- Enables unified search across all fields

### 3. Frontend Implementation

To enable student name search:

1. Load `student-authors.json` in the frontend
2. Create filename → author mapping
3. Add author search filter to UI (similar to instructor filter)
4. Update search logic to include author field
5. Display author name in project cards/results

### 4. Ongoing Maintenance

- Re-run `extract_all_authors.js` when new PDFs are added
- Keep `student-authors.json` in sync with project database
- Consider adding student name field to SharePoint/submission form for future projects

## Technical Details

### Dependencies
- Node.js (for running extraction script)
- `pdftotext` command-line tool (from Poppler utils)
- Standard Node.js modules: `child_process`, `fs`

### Running the Extraction
```bash
# From APPExplorer root directory
node extract_all_authors.js
```

### Extraction Time
- Processes ~637 PDFs in approximately 2-3 minutes
- Progress updates every 50 files

## Student Search Investigation Notes

### Search Process Used
1. Searched filenames in `APPLibrary.xlsx` and `FixedAPPLibraryMapping.xlsx`
2. Searched blob storage inventory (`comprehensive-storage-analysis.json`)
3. Searched download index (`projects_downloads_index.json`)
4. Searched PDF content (first 3 pages) using `pdftotext`

### Findings
- Student names appear inconsistently in filenames
- No metadata fields for student names in any database
- PDF content is the most reliable source for student names
- Some students may use different names (maiden names, nicknames, middle names)

## Questions for Future Consideration

1. Should we add a "Student Author" field to the project submission form?
2. Should we require student names in a standardized format?
3. Do we want to create a separate "Student Directory" page?
4. Should we extract other metadata from PDFs (advisor names, submission dates)?
5. How do we handle group projects with multiple students?

## Contact

For questions about this extraction process or to request modifications, refer to this documentation and the associated script files.

---

*Documentation created: November 6, 2025*
*Last updated: November 6, 2025*
