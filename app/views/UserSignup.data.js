var ViewData = require('./Base.data.js');
var api = require('../../modules/api');
var myUrl = require('../../modules/myurl');

module.exports = function (req, invitationID) {
    var ret = new ViewData(req, 'New User Sign-Up', 'UserSignup');
    ret.emailAddress = null;
    ret.invitation = null;
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
                        ret.pageTitle = 'Sign-Up for Representative of ' + invitation.RepresentedOrganization.Name;
                    } else if (invitation.ApplicantOrganization) {
                        ret.pageTitle = 'Sign-Up for Applicant to ' + invitation.ApplicantOrganization.Name;
                    } else if (invitation.EmployeeOrganization) {
                        ret.pageTitle = 'Sign-Up for Employee of ' + invitation.EmployeeOrganization.Name;
                    } else if (invitation.Educator) {
                        ret.pageTitle = 'Sign-Up for ' + invitation.Educator.FirstName + ' ' + invitation.Educator.LastName;
                    }
                    ret.pageMasthead = ret.generatePageMasthead(ret.pageTitle);
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