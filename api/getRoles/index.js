module.exports = async function (context, req) {
    context.log('GetRoles function processed a request.');

    // Get user claims from Azure Static Web Apps authentication
    const userClaims = req.headers['x-ms-client-principal'];

    if (!userClaims) {
        context.res = {
            status: 401,
            body: { error: 'User not authenticated' }
        };
        return;
    }

    try {
        // Decode the base64 encoded user claims
        const claims = JSON.parse(Buffer.from(userClaims, 'base64').toString());

        context.log('=== FULL USER CLAIMS DEBUG ===');
        context.log('User claims:', JSON.stringify(claims, null, 2));
        context.log('Claims array length:', claims.claims ? claims.claims.length : 0);

        // Log each claim individually
        if (claims.claims) {
            claims.claims.forEach((claim, index) => {
                context.log(`Claim ${index}: typ="${claim.typ}", val="${claim.val}"`);
            });
        }

        // Extract user information
        const user = {
            userId: claims.userId,
            userDetails: claims.userDetails,
            identityProvider: claims.identityProvider,
            claims: claims.claims || []
        };

        // Map Entra ID groups to application roles
        const groupToRoleMapping = {
            'FBS_StaffAll': 'staff',
            'FBS_Community': 'community'
        };

        // Extract groups from claims (groups can be in different claim types)
        const userGroups = [];

        // Check for groups in various claim formats
        if (claims.claims) {
            claims.claims.forEach(claim => {
                if (claim.typ === 'groups' || claim.typ === 'http://schemas.microsoft.com/ws/2008/06/identity/claims/groups') {
                    if (Array.isArray(claim.val)) {
                        userGroups.push(...claim.val);
                    } else {
                        userGroups.push(claim.val);
                    }
                }
            });
        }

        // Check if user has required groups
        const userRoles = [];
        const hasStaffAccess = userGroups.some(group => group === 'FBS_StaffAll' || group.includes('FBS_StaffAll'));
        const hasCommunityAccess = userGroups.some(group => group === 'FBS_Community' || group.includes('FBS_Community'));

        if (hasStaffAccess) {
            userRoles.push('FBS_StaffAll');
        }

        if (hasCommunityAccess) {
            userRoles.push('FBS_Community');
        }

        // Determine access level
        let accessLevel = 'none';
        if (hasStaffAccess || hasCommunityAccess) {
            accessLevel = 'authorized';
        }

        const response = {
            user: {
                id: user.userId,
                name: user.userDetails,
                provider: user.identityProvider
            },
            groups: userGroups,
            roles: userRoles,
            accessLevel: accessLevel,
            hasDownloadAccess: accessLevel === 'authorized',
            timestamp: new Date().toISOString(),
            debug: {
                rawClaims: claims.claims || [],
                identityProvider: claims.identityProvider,
                userId: claims.userId,
                userDetails: claims.userDetails,
                allClaimTypes: claims.claims ? claims.claims.map(c => c.typ) : []
            }
        };

        context.log('Returning response:', JSON.stringify(response, null, 2));

        context.res = {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: response
        };

    } catch (error) {
        context.log.error('Error processing user claims:', error);

        context.res = {
            status: 500,
            body: {
                error: 'Error processing authentication',
                details: error.message
            }
        };
    }
};