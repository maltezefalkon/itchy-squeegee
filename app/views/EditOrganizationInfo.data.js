var ViewData = require('./Base.data.js');
var api = require('../../modules/api');
var log = require('../../modules/logging')('EditOrganizationInfo');

module.exports = function (req, organizationID) {
    var data = new ViewData(req, 'Edit Organization Information', 'EditOrganizationInfo');
    var ret = data;
    if (!organizationID) {
        organizationID = req.user.LinkedOrganizationID;
    }
    if (!organizationID || req.user.LinkedOrganizationID != organizationID) {
        data.fatalError = 'Invalid user for requested organization.';
    } else {
        ret = api.querySingle('Organization', [ ], null, { OrganizationID: organizationID });
        ret = ret.then(function (organization) {
            data.organization = organization;
            return data;
        });
    }
    return ret;
}