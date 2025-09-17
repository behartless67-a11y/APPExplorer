module.exports = async function (context, req) {
    context.log("Project upload request received");
    
    try {
        if (req.method === "OPTIONS") {
            context.res = {
                status: 200,
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST,OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type"
                },
                body: ""
            };
            return;
        }
        
        const submissionId = `SUB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        context.res = {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: {
                success: true,
                message: "Project submitted successfully!",
                submissionId: submissionId
            }
        };
        
    } catch (error) {
        context.log.error("Error:", error);
        context.res = {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            body: { error: "Internal server error" }
        };
    }
};
