"use strict"

// requires
var log = require('../modules/logging')('formserver');
var api = require('../modules/api');
var meta = require('../modules/metadata')();
var forms = require('../modules/forms');
var Status = require('../biz/status');
var Promise = require('bluebird');
var email = require('../modules/email');
var myurl = require('../modules/myurl');
var _ = require('lodash');
var exec = require('child_process').exec;
var perf = require('../modules/performance-timing.js')();

// expose public methods
module.exports.postFormData = postFormData;
module.exports.getPDFForm = getPDFForm;

function postFormData(req, res, next) {
    var data = req.body;
    if (req.method != 'POST') {
        throw new Error('Invalid verb routed to postFormData');
    }

    var documentInstanceID = data.DocumentInstanceID;
    var section = data.Section;
    
    perf.start('postFormData');
    var promise = api.querySingle('DocumentInstance', ['Fields.Definition', 'Educator', 'ReferenceTenure.Organization', 'ApplicableTenure.Organization'], null, { DocumentInstanceID: documentInstanceID })
        .then(function (documentInstance) {
            return api.querySingle('DocumentDefinition', ['Fields'], null, { DocumentDefinitionID: documentInstance.DocumentDefinitionID })
                .then(function (documentDefinition) {
                    documentInstance.Definition = documentDefinition;
                    return documentInstance;
                });
            })
        .then(function (document) {
        return Promise.map(_.map(document.Fields, 'Definition'), function (fieldDefinition) {
            var fieldInstance = null;
            var value = data[fieldDefinition.DocumentDefinitionFieldID];
            if (value) {
                fieldInstance = forms.FindDocumentInstanceField(document, fieldDefinition.DocumentDefinitionFieldID);
                fieldInstance.FieldValue = value;
                return api.save(fieldInstance);
            }
        }).then(function () {
            return document;
        });
    });
    
    if (section == 'Educator') {
        promise.then(function (document) {
            log.debug('Saving document status');
            perf.start("Saving document status");
            document.StatusID = Status.CompletedByApplicant.ID;
            document.StatusDescription = _.template(Status.CompletedByApplicant.DescriptionTemplate)(document);
            return api.save(document, false).then(function () {
                perf.stop("Saving document status");
                return document;
            });
        }).then(function (document) {
            log.debug('writing PDF');
            perf.start('Writing PDF');
            return forms.GeneratePDF(document).then(function () {
                perf.stop("Writing PDF");
                return document;
            });
        }).then(function (document) {
            log.debug('Generating email');
            perf.start('Generating email');
            return email.sendForm168EmailToFormerEmployer(document).then(function () {
                perf.stop('Generating email');
                perf.stop('postFormData');
                return document;
            });
        }).then(function (document) {
            log.debug('Redirecting to educator dashboard');
            res.redirect(myurl.createUrl(myurl.createUrlType.EducatorDashboard, { EducatorID: document.EducatorID }, true));
        });
    } else if (section == 'FormerOrganization') {
        promise.then(function (document) {
            log.debug('Saving document status');
            document.StatusID = Status.CompletedByFormerEmployer.ID;
            document.StatusDescription = _.template(Status.CompletedByFormerEmployer.DescriptionTemplate)(document);
            return api.save(document, false).then(function () { return document; });
        }).then(function (document) {
            log.debug('writing PDF');
            perf.start("Writing PDF");
            return forms.GeneratePDF(document).then(function () {
                perf.stop("Writing PDF");
                return document;
            });
        }).then(function (document) {
            log.debug('Generating email');
            perf.start('Generating email');
            return email.sendForm168EmailToApplicationOrganization(document).then(function () {
                perf.stop('Generating email');
                perf.stop('postFormData');
                return document;
            });
        }).then(function (document) {
            log.debug('Redirecting to organization dashboard');
            res.redirect(myurl.createUrl(myurl.createUrlType.OrganizationDashboard, { OrganizationID: document.ApplicableTenure.OrganizationID }, true));
        });
    } else {
        promise.then(function () {
            perf.stop('postFormData');
            res.redirect(myurl.createUrl(myurl.createUrlType.Error, { Message: 'Unrecognized form section' }, true));
        });
    }
}

function getPDFForm(req, res, next) {
    var documentInstanceID = req.params.DocumentInstanceID;
    api.querySingle('DocumentInstance', [], null, { DocumentInstanceID: documentInstanceID })
        .then(function (documentInstance) {
        res.setHeader('content-type', 'application/pdf');
        res.setHeader('content-disposition', 'attachment; filename=' + documentInstanceID + '.pdf');
        res.write(documentInstance.PDF, 'binary');
        res.end();
    });
}
