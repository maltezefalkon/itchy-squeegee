var api = require('../../modules/api');
var ViewData = require('../../app/views/Base.data.js');
var log = require('../../modules/logging')('EducatorSignup');

// four kinds of educator signups
// (1) pre-defined educator (invitation.EducatorID)
// (2) employee of a specific organization (invitation.EmployeeOrganizationID)
// (3) applicant to a specific organization (invitation.ApplicantOrganizationID)
// (4) undefined, unattached educator (no invitation)
function getInvitationType(invitation) {
    if (!invitation) {
        return InvitationType.GeneralEducator;
    } else if (invitation.EmployeeOrganizationID) {
        return InvitationType.Employee;
    } else if (invitation.EducatorID) {
        return InvitationType.PredefinedEducator;
    } else if (invitation.ApplicantOrganizationID) {
        return InvitationType.Applicant;
    } else {
        return undefined;
    }
}

var InvitationType = {
    PredefinedEducator: {
        id: 1,
        requiresInvite: true
    },
    
    Employee: {
        id: 2,
        requiresInvite: true
    },
    
    Applicant: {
        id: 3,
        requiresInvite: true
    },
    
    GeneralEducator: {
        id: 4,
        requiresInvite: false
    }
};



module.exports = function (req, invitationID) {
    var data = new ViewData(req, 'Educator Sign-Up', 'EducatorSignup');
    var ret = data;
    if (invitationID) {
        // three kinds of educator invitations:
        ret = api.querySingle('Invitation', ['Educator.SeedOrganization', 'ApplicantOrganization', 'EmployeeOrganization' ], null, { InvitationID: invitationID });
        ret = ret.then(function (invitation) {
            var today = new Date();
            today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            if (!invitation) {
                data.fatalError = 'Unrecognized Invitation UUID';
            } else if (invitation.ExpirationDate < today) {
                data.fatalError = 'Expired Invitation specified';
            } else if (invitation.FulfillmentUserID != req.user.UserID) {
                log.error({ user: req.user, invitation: invitation }, 'Logged in as UserID that does not match FulfillmentUserID for Invitation');
                data.fatalError = 'Invalid user for requested invitation';
            } else {
                data.invitation = invitation;
                data.invitationType = getInvitationType(invitation);
                data.educator = invitation.Educator;
                data.organization = invitation.ApplicantOrganization || invitation.EmployeeOrganization || (invitation.Educator ? invitation.Educator.SeedOrganization : null);
                data.isApplicant = (invitation.ApplicantOrganizationID != null);
            }
            return data;
        });
    } else {
        ret.invitation = null;
        ret.invitationType = getInvitationType(null);
        ret.educator = null;
        ret.organization = null;
        ret.isApplicant = false;
    }
    return ret;
}
