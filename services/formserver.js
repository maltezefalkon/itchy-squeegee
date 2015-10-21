"use strict"

// requires
var log = require('../modules/logging')('formserver');
var api = require('../modules/api');
var meta = require('../modules/metadata')();
var forms = require('../modules/forms');
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
module.exports.createFormData = createFormData;

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
    }).then(function (documentInstance) {
        return Promise.map(_.map(documentInstance.Fields, 'Definition'), function (fieldDefinition) {
            var fieldInstance = null;
            var value = data[fieldDefinition.DocumentDefinitionFieldID];
            if (value) {
                fieldInstance = forms.FindDocumentInstanceField(documentInstance, fieldDefinition.DocumentDefinitionFieldID);
                fieldInstance.FieldValue = value;
                return api.save(fieldInstance);
            }
        }).then(function () {
            return documentInstance;
        });
    }).then(function (documentInstance) {
        var event = new meta.bo.SystemEvent();
        event.ObjectTypeKey = 'DocumentInstance';
        event.ObjectID = documentInstance.DocumentInstanceID;
        event.Description = 'Document section completed';
        event.Data = {
            Section: section,
            DocumentInstanceID: documentInstance.DocumentInstanceID
        };
        event.EventDateTime = new Date();
        event.ProcessDateTime = null;
        event.ProcessStatus = null;
        return api.save(event, false).then(function () {
            return documentInstance;
        })
    }).then(function (documentInstance) {
        perf.stop('postFormData');
        res.redirect(myUrl.createDefaultUrl(req.user));
    });
}

function downloadDocument(req, res, next) {
    var documentInstanceID = req.params.documentInstanceID;
    api.querySingle('DocumentInstance', ['Definition.Fields', 'Fields', 'Educator', 'BinaryFile'], null, { DocumentInstanceID: documentInstanceID })
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
            ret.mimeType = documentInstance.BinaryFile.FileMimeType;
            ret.fileData = documentInstance.BinaryFile.RawFileData;
            return Promise.resolve(ret);
        }
    }).then(function (values) {
        if (values.redirect) {
            res.redirect(values.redirect);
        } else {
            res.setHeader('content-type', values.mimeType);
            var extension = values.mimeType.split('/')[1]; // hack!
            var fileName = values.documentInstance.Name + ' for ' + values.documentInstance.Educator.FirstName + ' ' + values.documentInstance.Educator.LastName;
            res.setHeader('content-disposition', 'attachment; filename=' + fileName + '.' + extension);
            res.write(values.fileData, 'binary');
            res.end();
        }
    });
}

function uploadFormFile(req, res, next) {
    var documentDefinitionID = req.params.documentDefinitionID;
    var applicableTenureID = req.params.applicableTenureID;
    var referenceTenureID = req.params.referenceTenureID;
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
            log.debug('collected file data');
            data.file = Buffer.concat(fileData);
        });
    });
    req.busboy.on('field', function (fieldName, fieldValue, fieldNameTruncated, fieldValueTruncated) {
        if (fieldName == 'DocumentDate') {
            data.documentDate = new Date(fieldValue);
        } else {
            log.debug('Unhandled field: ' + fieldName);
        }
    });
    req.busboy.on('finish', function () {
        log.debug(data, 'Finished parsing file upload data. Saving.');
        var applicableTenure, referenceTenure;
        var promise = Promise.resolve();
        if (applicableTenureID) {
            promise = promise.then(function () {
                return api.query('Tenure', ['Organization'], null, { TenureID: applicableTenureID });
            });
        }
        if (referenceTenureID) {
            promise = promise.then(function () {
                return api.query('Tenure', ['Organization'], null, { TenureID: referenceTenureID });
            });
        }
        promise = promise.then(function () {
            var binaryFile = new meta.bo.BinaryFile();
            binaryFile.RawFileData = data.file;
            binaryFile.FileMimeType = data.mimeType;
            return api.save(binaryFile).then(function () { 
                return binaryFile;
            });
        }).then(function (binaryFile) {
            var documentInstance = forms.CreateDocumentInstance(forms.DocumentDefinitions[documentDefinitionID], req.user.LinkedEducator, applicableTenure, referenceTenure, null, data.documentDate);
            documentInstance.DocumentDate = data.documentDate;
            documentInstance.CompletedDateTime = new Date();
            documentInstance.NextRenewalDate = forms.CalculateRenewalDate(forms.DocumentDefinitions[documentDefinitionID], data.documentDate);
            documentInstance.BinaryFileID = binaryFile.BinaryFileID;
            return api.save(documentInstance).then(function () {
                return documentInstance;
            });
        }).then(function (documentInstance) {
            res.status(200).send(documentInstance.DocumentInstanceID);
        });
    });
}

function createFormData(req, res, next) {
    var documentDefinitionID = req.params.documentDefinitionID;
    var referenceTenureID = req.params.referenceTenureID;
    var applicableTenureID = req.params.applicableTenureID;
    var referenceTenure = null;
    var applicableTenure = null;
    var promise = Promise.resolve();
    if (referenceTenureID) {
        promise = promise.then(function () {
            return api.querySingle('Tenure', ['Organization'], null, { TenureID: referenceTenureID });
        }).then(function (returned) {
            referenceTenure = returned;
            return referenceTenure;
        });
        if (applicableTenureID) {
            promise = promise.then(function (referenceTenure) {
                return api.querySingle('Tenure', ['Organization'], null, { TenureID: applicableTenureID });
            }).then(function (returned) {
                applicableTenure = returned;
                return applicableTenure;
            });
        }
    }
    promise = promise.then(function () {
        return forms.CreateDocumentInstance(forms.DocumentDefinitions[documentDefinitionID], req.user.LinkedEducator, applicableTenure, referenceTenure, null, new Date());
    }).then(function (documentInstance) {
        return api.save(documentInstance, true).then(function () {
            return documentInstance;
        });
    }).then(function (documentInstance) {
        res.redirect(myUrl.createUrl(myUrl.createUrlType.FillForm, [documentInstance.DocumentInstanceID], req.query, true));
    });
}