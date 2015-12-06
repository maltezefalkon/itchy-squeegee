var _ = require('lodash');

var api = require('../../modules/api');
var ViewData = require('../../app/views/Base.data.js');
var DocumentStatus = require('../../biz/status').DocumentStatus;
var SubmissionStatus = require('../../biz/status').SubmissionStatus;
var DocumentFunctions = require('../../biz/document');
var forms = require('../../modules/forms');

module.exports = function (req) {
    return api.querySingle('Educator', [ 'Tenures.Organization', 'Tenures.Submissions', 'Documents.Definition' ], null, { EducatorID: req.user.LinkedEducatorID })
        .then(function (educator) {
        var ret = new ViewData(req, 'Educator Dashboard', 'EducatorDashboard');
        ret.educator = educator;
        ret.isTenureApplication = isTenureApplication;
        ret.isTenureCurrent = isTenureCurrent;
        ret.getDocumentStatusMarkup = getDocumentStatusMarkup;
        ret.getSubmissionStatusMarkup = getSubmissionStatusMarkup;
        ret.isDocumentReadyToSubmit = DocumentFunctions.isDocumentReadyToSubmit;
        ret.DocumentStatus = DocumentStatus;
        ret.SubmissionStatus = SubmissionStatus;
        ret.applicationTenures = _.filter(educator.Tenures, function (t) { return isTenureApplication(t); });
        ret.currentTenures = _.filter(educator.Tenures, function (t) { return isTenureCurrent(t); });
        ret.displayTenures = ret.applicationTenures.concat(ret.currentTenures);
        ret.Form168 = forms.Form168;
        return ret;
    }).then(function (ret) {
        return api.query('DocumentDefinition', [], null, null).then(function (definitions) {
            ret.requiredDocumentDescriptors = forms.ConstructRequiredDocumentDescriptors(ret.displayTenures, definitions, ret.educator.Tenures, ret.educator.Documents);
            ret.uploadableDocumentDefinitions = extractUniqueUploadableDefinitions(ret.requiredDocumentDescriptors);
            return ret;
        });
    });
}

function extractUniqueUploadableDefinitions(requiredDocumentDescriptors) {
    var ret = [];
    var uniqueIDs = [];
    for (var i in requiredDocumentDescriptors) {
        if (requiredDocumentDescriptors[i].DocumentDefinition.HasUpload) {
            var thisID = requiredDocumentDescriptors[i].DocumentDefinition.DocumentDefinitionID;
            if (uniqueIDs.indexOf(thisID) < 0) {
                ret.push(requiredDocumentDescriptors[i].DocumentDefinition);
                uniqueIDs.push(thisID);
            }
        }
    }
    return ret;
}

function getOrganizationsToDisplay(tenures) {
    var ret = {};
    for (var i = 0; i < tenures.length; i++) {
        var id = tenures[i].OrganizationID;
        if (!ret[id]) {
            ret[id] = {
                organization: tenures[i].Organization,
                tenures: [],
                documents: []
            };
        }
        ret[id].tenures.push(tenures[i]);
    }
    return ret;
}

function isTenureApplication(tenure) {
    return !tenure.StartDate;
}

function isTenureCurrent(tenure) {
    return tenure.StartDate && !tenure.EndDate;
}

function getDocumentStatusMarkup(document) {
    var statusID = getDocumentStatusID(document);
    var status = DocumentStatus.LookupByID(statusID);
    return status.getMarkup();
}

function getSubmissionStatusMarkup(submission, document) {
    var statusID = getSubmissionStatusID(submission, document);
    var status = SubmissionStatus.LookupByID(statusID);
    return status.getMarkup();
}

function getDocumentStatusID(document) {
    return !document ? DocumentStatus.Missing.StatusID : (
         document.RenewalDate > new Date() ? DocumentStatus.Valid.StatusID : DocumentStatus.Expired.StatusID
);
}

function getSubmissionStatusID(submission, document) {
    if (submission && document) {
        return submission.StatusID;
    } else if (!submission && document) {
        return SubmissionStatus.Created.StatusID;
    } else {
        return SubmissionStatus.Missing.StatusID;
    }
}
