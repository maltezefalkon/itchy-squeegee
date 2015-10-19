var ViewData = require('./Base.data.js');
var api = require('../../modules/api');
var myurl = require('../../modules/myurl.js');
var DocumentStatus = require('../../biz/status').DocumentStatus;
var SubmissionStatus = require('../../biz/status').SubmissionStatus;
var _ = require('lodash');

module.exports = function (req) {
    var data = new ViewData(req, 'Organization Dashboard', 'OrganizationDashboard');
    data.getValidationImage = getValidationImage;
    data.getSubmissionStatus = getSubmissionStatus;
    data.findTenure = findTenure;
    data.SubmissionStatus = SubmissionStatus;
    var ret = data;
    var organizationID = req.user.LinkedOrganizationID;
    if (organizationID) {
        ret = api.querySingle('Organization', ['Tenures.Educator', 'Tenures.Submissions.DocumentInstance'], null, { OrganizationID: organizationID })
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
        }).then(function (data) {
            data.documentsForReview = _.flatten(_.pluck(data.organization.Tenures, 'Submissions')).filter(function (sub) {
                return SubmissionStatus.GetStatus(sub).StatusID == SubmissionStatus.AwaitingApproval.StatusID;
            });
            return data;
        });
    } else {
        ret.fatalError = 'Failed to find associated organization for current user';
    }
    return ret;
}

function getSubmissionStatus(tenure, documentDefinition) {
    var submission = _.find(tenure.Submissions, function (sub) {
        return sub.ApplicableTenureID == tenure.TenureID && sub.DocumentInstance.DocumentDefinitionID == documentDefinition.DocumentDefinitionID;
    });
    return SubmissionStatus.GetStatus(submission);
}

function getValidationImage(tenure, documentDefinitions) {
    var minID = null;
    var minOK = false;
    for (var i in documentDefinitions) {
        if (documentDefinitions[i].RenewDuringEmployment || !tenure.StartDate) {
            var thisStatus = getSubmissionStatus(tenure, documentDefinitions[i]);
            if (!minID || thisStatus.StatusID < minID) {
                minID = thisID;
                minOK = thisStatus.IsOK;
            }
        }
    }
    if (!minID || !minOK) {
        return '/client/images/x.png';
    } else {
        return '/client/images/check.png';
    }
}

function findTenure(submission, allTenures) {
    return _.find(allTenures, function (t) {
        return t.EducatorID == submission.EducatorID;
    });
}