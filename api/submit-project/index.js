module.exports = async function (context, req) {
    context.log('Project submission request received', req.method);
    
    try {
        // Handle CORS preflight
        if (req.method === 'OPTIONS') {
            context.res = {
                status: 200,
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'POST,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type'
                },
                body: ''
            };
            return;
        }
        
        // Only allow POST requests for submissions
        if (req.method !== 'POST') {
            context.res = {
                status: 405,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { error: 'Method not allowed. Use POST.' }
            };
            return;
        }
        
        // Parse the request body
        let submissionData;
        try {
            submissionData = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        } catch (e) {
            context.res = {
                status: 400,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { error: 'Invalid JSON in request body' }
            };
            return;
        }
        
        // Validate required fields
        const requiredFields = ['projectName', 'studentName', 'instructor', 'projectStartTerm'];
        const missingFields = requiredFields.filter(field => !submissionData[field]);
        
        if (missingFields.length > 0) {
            context.res = {
                status: 400,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: { 
                    error: 'Missing required fields', 
                    missingFields: missingFields 
                }
            };
            return;
        }
        
        // Generate a unique submission ID
        const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create submission record with all metadata
        const submission = {
            id: submissionId,
            projectName: submissionData.projectName,
            studentName: submissionData.studentName,
            instructor: submissionData.instructor,
            projectStartTerm: submissionData.projectStartTerm,
            clientOrgName: submissionData.clientOrgName || '',
            clientContactName: submissionData.clientContactName || '',
            clientContactTitle: submissionData.clientContactTitle || '',
            primaryTopic: submissionData.primaryTopic || '',
            projectSummary: submissionData.projectSummary || '',
            geographicScope: submissionData.geographicScope || '',
            submittedAt: new Date().toISOString(),
            status: 'pending_review', // Can be: pending_review, approved, rejected
            files: submissionData.files || [] // Will be populated by file upload
        };
        
        // Log the submission for audit purposes
        context.log(`New project submission: ${submission.projectName} by ${submission.studentName}`);
        context.log(`Submission details:`, JSON.stringify(submission, null, 2));
        
        // In a real implementation, you would:
        // 1. Save submission to database (Azure Cosmos DB, etc.)
        // 2. Handle file uploads to Azure Blob Storage
        // 3. Send notification emails to administrators
        // 4. Generate unique download URLs for uploaded files
        
        // For now, we'll simulate successful submission
        const response = {
            success: true,
            submissionId: submissionId,
            message: 'Project submitted successfully and is pending review',
            submission: {
                id: submissionId,
                projectName: submission.projectName,
                studentName: submission.studentName,
                instructor: submission.instructor,
                projectStartTerm: submission.projectStartTerm,
                submittedAt: submission.submittedAt,
                status: submission.status
            },
            nextSteps: [
                'Your submission is being reviewed by administrators',
                'You will receive an email notification once approved',
                'Approved projects will appear in the main project explorer'
            ]
        };
        
        context.res = {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: response
        };
        
    } catch (error) {
        context.log.error('Error in submit-project function:', error);
        context.res = {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: { 
                error: 'Internal server error',
                message: 'Failed to process project submission',
                details: error.message
            }
        };
    }
};