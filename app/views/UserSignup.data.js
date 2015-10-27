var ViewData = require('./Base.data.js');
var api = require('../../modules/api');
var myUrl = require('../../modules/myurl');

module.exports = function (req, invitationID) {
    var ret = new ViewData(req, 'New User Sign-Up', 'UserSignup');
    ret.emailAddress = null;
    ret.invitation = null;
    ret.invitationNotice = null;
    ret.invitationDescriptor = null;
    if (invitationID) {
        return api.querySingle('Invitation', ['RepresentedOrganization', 'ApplicantOrganization', 'EmployeeOrganization', 'Educator'], null, { InvitationID: invitationID }).then(function (invitation) {
            var today = new Date();
            today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            if (invitation) {
                if (invitation.ExpirationDate < today) {
                    ret.fatalError = 'Expired Invitation specified';
                } else if (invitation.FulfillmentUserID) {
                    ret.redirect = myUrl.createUrl(myUrl.createUrlType.Login);
                } else {
                    ret.invitation = invitation;
                    if (invitation.RepresentedOrganization) {
                        ret.invitationDescriptor = 'Representative of ' + invitation.RepresentedOrganization.Name;
                    } else if (invitation.ApplicantOrganization) {
                        ret.invitationDescriptor = 'Applicant to ' + invitation.ApplicantOrganization.Name;
                    } else if (invitation.EmployeeOrganization) {
                        ret.invitationDescriptor = 'Employee of ' + invitation.EmployeeOrganization.Name;
                    } else if (invitation.Educator) {
                        ret.invitationDescriptor = invitation.Educator.FirstName + ' ' + invitation.Educator.LastName;
                    }
                    ret.pageTitle = 'Sign-Up for ' + ret.invitationDescriptor;
                    ret.pageMasthead = ret.generatePageMasthead(ret.pageTitle);
                    var article = invitation.RepresentedOrganization ? 'a' : 'an';
                    ret.invitationNotice = 'You have reached this page through an invitation ' +
                        'intended for ' + article + ' <b>' + ret.invitationDescriptor + '</b>. ' +
                        'If you have reached this page in error, please <a href="' + ret.createUrl('UserSignup') + '">click here</a> ' +
                        'to create an individual account instead.';
                    ret.emailAddress = invitation.EmailAddress;
                }
                return ret;
            } else {
                ret.fatalError = 'Unrecognized Invitation UUID';
            }
            return ret;
        });
    } else {
        return ret;
    }
}