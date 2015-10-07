var log = require('../modules/logging.js')('GenerateInvitation');
var api = require('../modules/api.js');

var uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

var entityTypeKey = process.argv[2];
var entityID = process.argv[3];
var emailAddress = process.argv[4];

if (!entityTypeKey || !entityID) {
    throw new Error('Usage: GenerateInvitation (Educator|Organization|Applicant) (EducatorID|OrganizationID) <emailaddress>');
}

var expirationDate = new Date();
expirationDate.setDate(expirationDate.getDate() + 14);

var invitation = {
    _TypeKey: 'Invitation',
    EmailAddress: emailAddress || null,
    ExpirationDate: expirationDate
};

if (entityTypeKey == 'Educator') {
    invitation.EducatorID = entityID;
} else if (entityTypeKey == 'Employee') {
    invitation.EmployeeOrganizationID = entityID;
} else if (entityTypeKey == 'Organization') {
    invitation.RepresentedOrganizationID = entityID;
} else if (entityTypeKey == 'Applicant') {
    invitation.ApplicantOrganizationID = entityID;
} else {
    throw new Error('Unrecognized entity type: ' + entityTypeKey + '. Expected: Educator, Organization, or Applicant');
}

api.save(invitation).then(function () {
    process.stdout.write('\n' + invitation.InvitationID);
    process.exit(0);
});

