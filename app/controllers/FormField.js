function RenderFormField(scope, elem, attr, modelCtrl) {
    var html = '<div>Form Field: Name = <b>' + scope.field.FieldName + '</b></div>';
    if (scope.field.FormFieldType == 'YesNoRadio') {
        html = 
            '<div class="row">' +
                '<div class="col-sm-3">' +
                    '<div class="controls-row">' +
                        '<label class="radio-inline"><input type="radio" ng-model="ngModel" name="' + scope.name + '" value="true" required="required" /> Yes</label> ' +
                        '<label class="radio-inline"><input type="radio" ng-model="ngModel" name="' + scope.name + '" value="false" required="required" /> No</label>' +
                    '</div>' +
                '</div>' +
                '<div class="col-sm-9">' +
                    scope.field.FieldDescription +
                '</div>' +
                '<div class="row">' +
                    '<div class="col-sm-12">' +
                        '<br />' +
                    '</div>' +
                '</div>' +
            '</div>';
    } else if (scope.field.FormFieldType == 'Signature') {
        html =
            '<div class="row">' +
                '<div class="">' +
                    '<div class="form-group">' +
                        '<label class="control-label col-sm-3" for="' + scope.name + '">' + scope.field.FieldDescription + '</label>' +
                        '<div class="col-sm-9">' +
                            '<input type="text" name="' + scope.name + '" ng-model="ngModel" required="required" class="form-control" />' +
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
    elem.html(html);
}

