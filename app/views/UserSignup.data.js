var ViewData = require('./Base.Data.js');
var api = require('../../modules/api');
var myUrl = require('../../modules/myurl');

module.exports = function (req, invitationID) {
    var ret = new ViewData(req, 'New User Sign-Up', 'UserSignup');
    ret.emailAddress = null;
    ret.invitation = null;
    if (invitationID) {
        return api.querySingle('Invitation', [], null, { InvitationID: invitationID }).then(function (invitation) {
            var today = new Date();
            today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            if (invitation) {
                if (invitation.ExpirationDate < today) {
                    ret.fatalError = 'Expired Invitation specified';
                } else if (invitation.FulfillmentUserID) {
                    ret.redirect = myUrl.createUrl(myUrl.createUrlType.Login);
                } else {
                    ret.invitation = invitation;
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