var _ = require('lodash');

var api = require('../../modules/api');
var ViewData = require('../../app/views/Base.data.js');
var Status = require('../../biz/status');

module.exports = function (req) {
    return api.querySingle('Educator', [ 'Tenures.Organization', 'Tenures.Submissions', 'Documents.Definition' ], null, { EducatorID: req.user.LinkedEducatorID })
        .then(function (educator) {
        var ret = new ViewData(req, 'Educator Dashboard', 'EducatorDashboard');
        ret.educator = educator;
        ret.isTenureApplication = isTenureApplication;
        ret.isTenureCurrent = isTenureCurrent;
        ret.getStatusIcon = getStatusIcon;
        ret.getStatusDescription = getStatusDescription;
        ret.Status = Status;
        ret.applicationTenures = _.filter(educator.Tenures, function (t) { return isTenureApplication(t); });
        ret.currentTenures = _.filter(educator.Tenures, function (t) { return isTenureCurrent(t); });
        ret.displayTenures = ret.applicationTenures.concat(ret.currentTenures);
        return ret;
    }).then(function (ret) {
        return api.query('DocumentDefinition', [], null, null).then(function (definitions) {
            ret.requiredDocumentDescriptors = constructRequiredDocumentDescriptors(ret.displayTenures, definitions, ret.educator.Tenures, ret.educator.Documents);
            ret.uploadableDocumentDefinitions = extractUniqueUploadableDefinitions(ret.requiredDocumentDescriptors);
            return ret;
        });
    });
}

function extractUniqueUploadableDefinitions(requiredDocumentDescriptors) {
    var ret = [];
    var uniqueIDs = [];
    for (var i in requiredDocumentDescriptors) {
        if (requiredDocumentDescriptors[i].DocumentDefinition.IsUpload) {
            var thisID = requiredDocumentDescriptors[i].DocumentDefinition.DocumentDefinitionID;
            if (uniqueIDs.indexOf(thisID) < 0) {
                ret.push(requiredDocumentDescriptors[i].DocumentDefinition);
                uniqueIDs.push(thisID);
            }
        }
    }
    return ret;
}

function constructRequiredDocumentDescriptors(displayTenures, definitions, allTenures, documents) {
    var ret = [];
    for (var j in definitions) {
        if (definitions[j].HasInstancePerEmployer) {
            for (var i in displayTenures) {
                if (isTenureApplication(displayTenures[i]) || definitions[j].RenewDuringEmployment) {
                    if (definitions[j].HasInstancePerPreviousTenure) {
                        var filteredTenures = _.filter(allTenures, function (t) { return t.StartDate; });
                        for (var k in filteredTenures) {
                            var descriptor = { DocumentDefinition: definitions[j], ApplicableTenure: displayTenures[i], ReferenceTenure: filteredTenures[j] };
                            descriptor.Documents = _.filter(documents, function (doc) { return doc.DocumentDefinitionID == definitions[j].DocumentDefinitionID && doc.ApplicableTenureID == displayTenures[i].ApplicableTenureID && doc.ReferenceTenureID == filteredTenures[j].TenureID; }).sort(function (a, b) { return dateSortDescending(a.DocumentDate, b.DocumentDate); });
                            descriptor.Name = definitions[j].Name + ' from ' + filteredTenures[j].Organization.Name + ' for ' + displayTenures[i].Organization.Name;
                            ret.push(descriptor);
                        }
                    } else {
                        var descriptor = { DocumentDefinition: definitions[j], ApplicableTenure: displayTenures[i], ReferenceTenure: null };
                        descriptor.Documents = _.filter(documents, function (doc) { return doc.DocumentDefinitionID == definitions[j].DocumentDefinitionID && doc.ApplicableTenureID == displayTenures[i].ApplicableTenureID; });
                        descriptor.Name = definitions[j].Name + ' for ' + displayTenures[i].Organization.Name;
                        ret.push(descriptor);
                    }
                }
            }
        } else {
            var descriptor = { DocumentDefinition: definitions[j], ApplicableTenure: null, ReferenceTenure: null };
            descriptor.Documents = _.filter(documents, function (doc) { return doc.DocumentDefinitionID == definitions[j].DocumentDefinitionID; });
            descriptor.Name = definitions[j].Name;
            ret.push(descriptor);
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

function dateSortDescending(date1, date2) {
    if (date1 > date2) {
        return -1;
    } else if (date1 < date2) {
        return 1;
    } else {
        return 0;
    }
}

function isTenureApplication(tenure) {
    return !tenure.StartDate;
}

function isTenureCurrent(tenure) {
    return tenure.StartDate && !tenure.EndDate;
}

function getStatusIcon(document) {
    return '<span class="glyphicon ' + getStatusGlyphicon(document) + ' ' + getStatusColor(document) + '"></span>';
}

function getStatusDescription(document) {
    return document ? document.StatusDescription : Status.Missing.Description;
}

function getStatusID(document) {
    return document ? document.StatusID : Status.Missing.ID;
}

function getStatusGlyphicon(document) {
    switch (getStatusID(document)) {
        case Status.Missing.ID: return 'glyphicon-ban-circle';
        case Status.CompletedByApplicant.ID: return 'glyphicon-star';
        case Status.EmailToFormerEmployerSent.ID: return 'glyphicon-envelope';
        case Status.AwaitingResponse.ID: return 'glyphicon-hourglass';
        case Status.CompletedByFormerEmployer.ID: return 'glyphicon-ok';
        case Status.Completed.ID: return 'glyphicon-ok';
        case Status.Expired.ID: return 'glyphicon-warning-sign';
    }
}

function getStatusColor(document) {
    switch (getStatusID(document)) {
        case Status.Missing.ID: return 'text-danger';
        case Status.CompletedByApplicant.ID: return 'text-info';
        case Status.EmailToFormerEmployerSent.ID: return 'text-warning';
        case Status.AwaitingResponse.ID: return 'text-primary';
        case Status.Completed.ID: return 'text-success';
        case Status.CompletedByFormerEmployer.ID: return 'text-success';
        case Status.Expired.ID: return 'text-danger';
    }
}

