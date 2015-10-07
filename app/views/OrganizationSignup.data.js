var ViewData = require('./Base.data.js');
var api = require('../../modules/api');
var log = require('../../modules/logging')('OrganizationSignup');

module.exports = function (req, invitationID) {
    var data = new ViewData(req, 'Organization Sign-Up', 'OrganizationSignup');
    var ret = data;
    if (invitationID) {
        ret = api.querySingle('Invitation', [ 'RepresentedOrganization' ], null, { InvitationID: invitationID });
        ret = ret.then(function (invitation) {
            var today = new Date();
            today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            if (invitation.ExpirationDate < today) {
                ret.fatalError = 'Expired Invitation specified';
            } else if (invitation.FulfillmentUserID != req.user.UserID) {
                log.error({ user: req.user, invitation: invitation }, 'Logged in as UserID that does not match FulfillmentUserID for Invitation');
                data.fatalError = 'Invalid user for requested invitation';
            } else {
                data.invitation = invitation;
                data.organization = invitation.RepresentedOrganization;
            }
            return data;
        });
    }
    return ret;
}