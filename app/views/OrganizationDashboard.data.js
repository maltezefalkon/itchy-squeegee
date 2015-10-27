var ViewData = require('./Base.data.js');
var api = require('../../modules/api');
var forms = require('../../modules/forms');
var myurl = require('../../modules/myurl.js');
var DocumentStatus = require('../../biz/status').DocumentStatus;
var SubmissionStatus = require('../../biz/status').SubmissionStatus;
var _ = require('lodash');

module.exports = function (req) {
    var data = new ViewData(req, 'Organization Dashboard', 'OrganizationDashboard');
    data.getMinimumStatus = getMinimumStatus;
    data.getSubscriptionDocumentName = getSubscriptionDocumentName;
    data.findSubmissions = findSubmissions;
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

function findSubmissions(tenure, documentDefinition) {
    var ret = _.filter(tenure.Submissions, function (sub) {
        return sub.ApplicableTenureID == tenure.TenureID && sub.DocumentInstance.DocumentDefinitionID == documentDefinition.DocumentDefinitionID;
    });
    return ret;
}

function getMinimumStatus(tenure, documentDefinitions) {
    var min = SubmissionStatus.Approved;
    for (var i in documentDefinitions) {
        if (documentDefinitions[i].RenewDuringEmployment || !tenure.StartDate) {
            var thisStatus = SubmissionStatus.GetMinimum(_.pluck(findSubmissions(tenure, documentDefinitions[i]), 'StatusID'));
            if (thisStatus.StatusID < min.StatusID) {
                min = thisStatus;
            }
        }
    }
    return min;
}

function findTenure(submission, allTenures) {
    return _.find(allTenures, function (t) {
        return t.EducatorID == submission.EducatorID;
    });
}

function getSubscriptionDocumentName(sub, allTenures) {
    if (sub.DocumentInstance.DocumentDefinitionID == forms.Form168.DocumentDefinitionID) {
        var orgName = sub.DocumentInstance.Name.substring(sub.DocumentInstance.Name.lastIndexOf('regarding ') + 'regarding '.length);
        return 'Document regarding ' + orgName;
    } else {
        return 'Document';
    }
}