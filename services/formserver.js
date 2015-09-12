"use strict"

// requires
var log = require('../modules/logging')('formserver');
var api = require('../modules/api');
var meta = require('../modules/metadata')();
var forms = require('../modules/forms');
var Promise = require('bluebird');
var email = require('../modules/email');
var myurl = require('../modules/myurl');

// expose public methods
module.exports.postFormData = postFormData;

function postFormData(req, res, next) {
    var data = req.body;
    if (req.method != 'POST') {
        throw new Error('Invalid verb routed to postFormData');
    }

    var documentInstanceID = data.DocumentInstanceID;
    var section = data.Section;

    var promise = api.querySingle('DocumentInstance', ['Definition.Fields', 'Fields', 'Educator', 'ReferenceTenure.Organization', 'ApplicableTenure.Organization'], null, { DocumentInstanceID: documentInstanceID })
        .then(function (document) {
        return Promise.map(document.Definition.Fields, function (field) {
            var fieldInstance = null;
            var value = data[field.DocumentDefinitionFieldID];
            if (value) {
                fieldInstance = forms.FindDocumentInstanceField(document, field.DocumentDefinitionFieldID);
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
            document.Status = forms.Status.CompletedByApplicant;
            return api.save(document).then(function () { return document; });
        }).then(function (document) {
            log.debug('Generating email');
            return email.sendForm168EmailToFormerEmployer(document).then(function () {
                return document;
            });
        }).then(function (document) {
            log.debug('Redirecting to educator dashboard');
            res.redirect(myurl.createUrl(myurl.createUrlType.EducatorDashboard, { EducatorID: document.EducatorID }, true));
        });
    } else if (section == 'FormerOrganization') {
        promise.then(function (document) {
            log.debug('Saving document status');
            document.Status = forms.Status.CompletedByEmployer;
            return api.save(document).then(function () { return document; });
        }).then(function (document) {
            log.debug('Generating email');
            return email.sendForm168EmailToApplicationOrganization(document).then(function () {
                return document;
            });
        }).then(function (document) {
            log.debug('Redirecting to organization dashboard');
            res.redirect(myurl.createUrl(myurl.createUrlType.OrganizationDashboard, { OrganizationID: document.ApplicableTenure.OrganizationID }, true));
        });
    } else {
        promise.then(function () {
            res.redirect(myurl.createUrl(myurl.createUrlType.Error, { Message: 'Unrecognized form section' }, true));
        });
    }
}

