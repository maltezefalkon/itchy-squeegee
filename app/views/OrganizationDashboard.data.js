var ViewData = require('./Base.data.js');
var api = require('../../modules/api');
var myurl = require('../../modules/myurl.js');
var DocumentStatus = require('../../biz/status').DocumentStatus;
var SubmissionStatus = require('../../biz/status').SubmissionStatus;
var _ = require('lodash');

module.exports = function (req) {
    var data = new ViewData(req, 'Organization Dashboard', 'OrganizationDashboard');
    data.generateEmployeeLink = generateEmployeeLink;
    data.generateApplicantLink = generateApplicantLink;
    data.employeeLink = '???';
    data.applicantLink = '???';
    data.getValidationImage = getValidationImage;
    data.getMinimumStatusDescription = getMinimumStatusDescription;
    var ret = data;
    var organizationID = req.user.LinkedOrganizationID;
    if (organizationID) {
        ret = api.querySingle('Organization', ['Tenures.Educator', 'Tenures.ApplicableDocuments'], null, { OrganizationID: organizationID })
            .then(function (org) {
                data.organizationID = organizationID;
                data.organization = org;
                data.applicationTenures = [];
                data.currentTenures = [];
                for (var i in data.organization.Tenures) {
                    if (data.organization.Tenures[i].StartDate) {
                        data.currentTenures.push(data.organization.Tenures[i]);
                    } else {
                        data.applicationTenures.push(data.organization.Tenures[i]);
                    }
                }
                return data;
            }).then(function (data) {
                return api.query('DocumentDefinition', ['Fields'], null, null);
            }).then(function (documentDefinitions) {
                data.documentDefinitions = documentDefinitions;
                return data;
            });
    } else {
        ret.fatalError = 'Failed to find associated organization for current user';
    }
    return ret;
}

function getValidationImage(tenure) {
    var ok = undefined;
    if (tenure.ApplicableDocuments.length > 0) {
        var minID = _.min(_.map(tenure.ApplicableDocuments, 'StatusID'));
        ok = SubmissionStatus.LookupByID(minID).IsOK;
    } else {
        return '/client/images/question.png';
    }
    return ok ? '/client/images/check.png' : '/client/images/x.png';
}

function getMinimumStatusDescription(tenure, documentDefinition) {
    var ret = undefined;
    var docs = _.filter(tenure.ApplicableDocuments, { "DocumentDefinitionID": documentDefinition.DocumentDefinitionID });
    if (docs.length > 0) {
        var minID = _.min(_.map(docs, 'StatusID'));
        ret = _.find(docs, { StatusID: minID }).StatusDescription;
    }
    return ret;
}

function generateApplicantLink() {
    return 'link';
}

function generateEmployeeLink() {

}