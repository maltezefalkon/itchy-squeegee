var ViewData = require('./Base.data.js');
var api = require('../../modules/api');
var log = require('../../modules/logging')('EditOrganizationInfo');

module.exports = function (req, organizationID) {
    var data = new ViewData(req, 'Edit Organization Information', 'EditOrganizationInfo');
    var ret = data;
    if (!organizationID && !req.user.Admin) {
        organizationID = req.user.LinkedOrganizationID;
    }
    if (!req.user.Admin && (!organizationID || req.user.LinkedOrganizationID != organizationID)) {
        data.fatalError = 'Invalid user for requested organization.';
    } else {
        ret = api.query('OrganizationType', [], null, null).then(function (types) {
            data.organizationTypes = types;
        }).then(function () { return data; });
        if (organizationID) {
            ret = ret.then(function () { api.querySingle('Organization', [], null, { OrganizationID: organizationID }); });
            ret = ret.then(function (organization) {
                data.organization = organization;
                data.organizationID = organizationID;
                return data;
            });
        } else {
            ret = ret.then(function () {
                data.organization = null;
                data.organizationID = null;
                return data;
            });
        }
    }
    return ret;
}