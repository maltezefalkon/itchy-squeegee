"use strict"

// requires
var log = require('../modules/logging')('formserver');
var api = require('../modules/api');
var meta = require('../modules/metadata')();
var forms = require('../modules/forms');
var Promise = require('bluebird');

// expose public methods
module.exports.postFormData = postFormData;

function postFormData(req, res, next) {
    var data = req.body;
    if (req.method != 'POST') {
        throw new Error('Invalid verb routed to postFormData');
    }

    var documentInstanceID = data.DocumentInstanceID;
    api.querySingle('DocumentInstance', ['Definition.Fields', 'Fields'], null, { DocumentInstanceID: documentInstanceID })
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
        }).then(function (document) {
            log.debug('Saving document status');
            document.Status = forms.Status.CompletedByApplicant;
        return api.save(document).then(function () { return document; });
        }).then(function (document) {
            log.debug('Redirecting');
            res.redirect('/app/protected/EducatorDashboard.html?EducatorID=' + encodeURIComponent(document.EducatorID));
        });
}

