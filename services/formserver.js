"use strict"

// requires
var log = require('../modules/logging')('formserver');
var api = require('../modules/api');
var meta = require('../modules/metadata')();
var forms = require('../modules/forms');
var Status = require('../biz/status');
var Promise = require('bluebird');
var email = require('../modules/email');
var myUrl = require('../modules/myurl');
var _ = require('lodash');
var exec = require('child_process').exec;
var perf = require('../modules/performance-timing.js')();

// expose public methods
module.exports.postFormData = postFormData;
module.exports.downloadDocument = downloadDocument;
module.exports.uploadFormFile = uploadFormFile;

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
            log.debug('Generating email');
            perf.start('Generating email');
            return email.sendForm168EmailToFormerEmployer(document).then(function () {
                perf.stop('Generating email');
                perf.stop('postFormData');
                return document;
            });
        }).then(function (document) {
            log.debug('Redirecting to educator dashboard');
            res.redirect(myUrl.createUrl(myUrl.createUrlType.EducatorDashboard, { EducatorID: document.EducatorID }, true));
        });
    } else if (section == 'FormerOrganization') {
        promise.then(function (document) {
            log.debug('Saving document status');
            document.StatusID = Status.CompletedByFormerEmployer.ID;
            document.StatusDescription = _.template(Status.CompletedByFormerEmployer.DescriptionTemplate)(document);
            return api.save(document, false).then(function () { return document; });
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
            res.redirect(myUrl.createUrl(myUrl.createUrlType.OrganizationDashboard, { OrganizationID: document.ApplicableTenure.OrganizationID }, true));
        });
    } else {
        promise.then(function () {
            perf.stop('postFormData');
            res.redirect(myUrl.createUrl(myUrl.createUrlType.Error, { Message: 'Unrecognized form section' }, true));
        });
    }
}

function downloadDocument(req, res, next) {
    var documentInstanceID = req.params.documentInstanceID;
    api.querySingle('DocumentInstance', ['Definition.Fields', 'Fields'], null, { DocumentInstanceID: documentInstanceID })
    .then(function (documentInstance) {
        var ret = {
            redirect: null,
            documentInstance: documentInstance,
            fileData: null,
            mimeType: null
        };
        if (!documentInstance) {
            ret.redirect = myUrl.createUrl(myUrl.createUrlType.Error, { message: 'Invalid Document UUID' });
            return Promise.resolve(ret);
        } else if (!documentInstance.Definition.IsUpload) {
            return forms.GeneratePDF(documentInstance).then(function (fileData) {
                ret.mimeType = 'application/pdf';
                ret.fileData = fileData;
                return ret;
            });
        } else {
            ret.mimeType = documentInstance.FileMimeType;
            ret.fileData = documentInstance.RawFileData;
            return Promise.resolve(ret);
        }
    }).then(function (values) {
        if (values.redirect) {
            res.redirect(values.redirect);
        } else {
            res.setHeader('content-type', values.mimeType);
            var extension = values.mimeType.split('/')[1]; // hack!
            res.setHeader('content-disposition', 'attachment; filename=' + documentInstanceID + '.' + extension);
            res.write(values.fileData, 'binary');
            res.end();
        }
    });
}

function uploadFormFile(req, res, next) {
    var documentInstanceID = req.params.documentInstanceID;
    var data = {
        file: null,
        documentDate: null,
        mimeType: null
    };
    req.pipe(req.busboy);
    req.busboy.on('file', function (fieldName, file, fileName, encoding, mimeType) {
        var fileData = [];
        data.mimeType = mimeType;
        file.on('data', function (chunk) {
            fileData.push(chunk);
        });
        file.on('end', function () {
            data.file = Buffer.concat(fileData);
        });
    });
    req.busboy.on('field', function (fieldName, fieldValue, fieldNameTruncated, fieldValueTruncated) {
        if (fieldName == 'DocumentDate') {
            data.documentDate = new Date(Number(fieldValue.substr(0, 4)), Number(fieldValue.substr(5, 2)) - 1, Number(fieldValue.substr(8, 2)));
        } else {
            log.debug('Unhandled field: ' + fieldName);
        }
    });
    req.busboy.on('finish', function () {
        log.debug(data, 'Finished parsing file upload data. Saving.');
        Promise.settle(
            api.querySingle('DocumentInstance', ['Definition'], null, { DocumentInstanceID: documentInstanceID })
            .then(function (documentInstance) {
                documentInstance.RawFileData = data.file;
                documentInstance.DocumentDate = data.documentDate;
                documentInstance.CompletedDateTime = new Date();
                documentInstance.FileMimeType = data.mimeType;
                documentInstance.NextRenewalDate = forms.CalculateRenewalDate(documentInstance.Definition, data.documentDate);
                var status = documentInstance.NextRenewalDate > new Date() ? Status.Completed : Status.Expired;
                documentInstance.StatusID = status.ID;
                documentInstance.StatusDescription = _.template(status.DescriptionTemplate)(documentInstance);
                return api.save(documentInstance);
            }).then(function () {
                res.redirect(myUrl.createDefaultUrl(req.user));
            }).reflect());
    });
}