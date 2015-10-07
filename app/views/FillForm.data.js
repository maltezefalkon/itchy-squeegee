var api = require('../../modules/api');
var ViewData = require('../../app/views/Base.data.js');

module.exports = function (req, documentInstanceID) {
    return api.querySingle('DocumentInstance', ['Fields', 'ApplicableTenure.Organization', 'ApplicableTenure.Educator', 'ReferenceTenure.Organization'], null, { DocumentInstanceID: documentInstanceID })
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
            '<div class="row">' +
                '<div class="col-sm-3">' +
                    '<div class="controls-row">' +
                        '<label class="radio-inline"><input type="radio" ng-model="ngModel" name="' + controlName + '" value="true" required="required" /> Yes</label> ' +
                        '<label class="radio-inline"><input type="radio" ng-model="ngModel" name="' + controlName + '" value="false" required="required" /> No</label>' +
                    '</div>' +
                '</div>' +
                '<div class="col-sm-9">' +
                    field.FieldDescription +
                '</div>' +
                '<div class="row">' +
                    '<div class="col-sm-12">' +
                        '<br />' +
                    '</div>' +
                '</div>' +
            '</div>';
    } else if (field.FormFieldType == 'Signature') {
        html =
            '<div class="row">' +
                '<div class="">' +
                    '<div class="form-group">' +
                        '<label class="control-label col-sm-3" for="' + controlName + '">' + field.FieldDescription + '</label>' +
                        '<div class="col-sm-9">' +
                            '<input type="text" name="' + controlName + '" ng-model="ngModel" required="required" class="form-control" />' +
                        '</div>' +
                    '</div>' +
                    '<div class="col-sm-offset-3 col-sm-9">' +
                        'This is legalese to ensure that the user understands that this is a legal signature.' +
                        '<span class="text-info" style="margin: 10px; cursor: pointer; white-space: nowrap">' +
                            '<span class="glyphicon glyphicon-info-sign"></span> More info' +
                        '</span>' +
                    '</div>' +
                '</div>' +
                '<div class="row">' +
                    '<div class="col-sm-12">' +
                        '<br />' +
                    '</div>' +
                '</div>' +
            '</div>';
    }
    return html;
}