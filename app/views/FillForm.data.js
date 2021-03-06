﻿var api = require('../../modules/api');
var ViewData = require('../../app/views/Base.data.js');

module.exports = function (req, documentInstanceID) {
    return api.querySingle('DocumentInstance', ['Fields', 'ApplicableTenure.Organization', 'Educator', 'ReferenceTenure.Organization'], null, { DocumentInstanceID: documentInstanceID })
        .then(function (documentInstance) {
            return api.querySingle('DocumentDefinition', ['Fields'], null, { DocumentDefinitionID: documentInstance.DocumentDefinitionID })
            .then(function (documentDefinition) {
                var ret = new ViewData(req, 'Complete ' + documentDefinition.Name);
                var section = undefined;
                if (documentInstance.EducatorID == req.user.LinkedEducatorID) {
                    section = 'Educator';
                } else if (documentInstance.ApplicableTenure.OrganizationID == req.user.LinkedOrganizationID) {
                    section = 'ApplicationOrganization';
                } else if (documentInstance.ReferenceTenure.OrganizationID == req.user.LinkedOrganizationID) {
                    section = 'FormerOrganization';
                } else {
                    ret.fatalError = 'Invalid document for this user';
                }
                ret.section = section;
                ret.documentDefinition = documentDefinition;
                ret.documentInstance = documentInstance;
                ret.generateFormField = generateFormField;
                return ret;
            });
        });
}

function generateFormField(field) {
    var html = '<div>Form Field: Name = <b>' + field.FieldName + '</b></div>';
    var controlName = field.DocumentDefinitionFieldID;
    if (field.FormFieldType == 'YesNoRadio') {
        html =
            '<div class="row form-field-row">' +
                '<div class="col-sm-3">' +
                    '<div class="controls-row">' +
                        '<label class="radio-inline"><input type="radio" ng-model="ngModel" name="' + controlName + '" value="true" required="required" /> Yes</label> ' +
                        '<label class="radio-inline"><input type="radio" ng-model="ngModel" name="' + controlName + '" value="false" required="required" /> No</label>' +
                    '</div>' +
                '</div>' +
                '<div class="col-sm-9">' +
                    field.FieldDescription +
                '</div>' +
            '</div>';
    } else if (field.FormFieldType == 'Signature') {
        html =
            '<div class="row form-field-row">' +
                '<div class="">' +
                    '<div class="form-group">' +
                        '<div>' +
                            '<label class="control-label col-sm-3" for="' + controlName + '">' + field.FieldDescription + '</label>' +
                        '</div>' +
                        '<div class="col-sm-9">' +
                            '<div id="div-' + controlName + '" class="sig" inputID="' + controlName + '"></div>' +
                            '<input type="hidden" id="' + controlName + '" name="' + controlName + '" />' +
                            '<div><button class="btn btn-warning btn-md" type="button" onclick="$(\'#div-' + controlName + '\').signature(\'clear\')">Clear</button></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="col-sm-offset-3 col-sm-9">' +
                        'This is legalese to ensure that the user understands that this is a legal signature.' +
                        '<span class="text-info" style="margin: 10px; cursor: pointer; white-space: nowrap">' +
                            '<span class="glyphicon glyphicon-info-sign"></span> More info' +
                        '</span>' +
                    '</div>' +
                '</div>' +
            '</div>';
    } else if (field.FormFieldType == 'Textarea') {
        html =
            '<div class="row form-field-row">' +
                '<div class="col-xs-12">' + field.FieldDescription + '</div>' +
                '<div class="col-xs-12">' +
                    '<textarea name="' + controlName + '" ng-model="ngModel" rows="5" class="form-control"' +
                    (field.FieldMaxLength ? ' maxlength="' + field.FieldMaxLength + '"' : '') + '>' +
                    '</textarea>' +
                '</div>' +
            '</div>';
    } else if (field.FormFieldType == 'Textbox') {
        html =
            '<div class="row form-field-row">' +
                '<div class="col-xs-12">' + field.FieldDescription + '</div>' +
                '<div class="col-xs-12">' +
                    '<input name="' + controlName + '" ng-model="ngModel" class="form-control"' +
                    (field.FieldMaxLength ? ' maxlength="' + field.FieldMaxLength + '"' : '') + ' />' +
                //'</div>' +
            '</div>';
    } else if (field.FormFieldType == 'Checkbox') {
        html =
            '<div class="row form-field-row">' +
                '<div class="col-sm-12">' +
                    '<div class="checkbox">' +
                        '<label for="' + controlName + '">' +
                            '<input type="checkbox" ng-model="ngModel" name="' + controlName + '" value="true" />' +
                            '<span>' + field.FieldDescription + '</span>' +
                        '</label>' +
                    '</div>' +
                '</div>' +
            '</div>';
    }
    return html;
}