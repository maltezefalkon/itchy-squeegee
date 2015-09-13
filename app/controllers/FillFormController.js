"use strict"

function FillFormController($scope, $http, $location) {

    var dict = parseQueryString();
    $scope.TenureID = dict['TenureID'];
    $scope.EducatorID = dict['EducatorID'];
    $scope.DocumentDefinitionID = dict['DocumentDefinitionID'];
    $scope.DocumentInstanceID = dict['DocumentInstanceID'];
    $scope.Section = dict['Section'];
    $scope.fieldFilter = {
        FieldSection: $scope.Section,
        FieldExpression: null
    };
    FetchData($scope, $http, $location);

    // expose public functions
    $scope.submitForm = function ($event) {
        SubmitForm($scope, $http, $event);
    }
}

function FetchData($scope, $http, $location) {
    if ($scope.DocumentInstanceID) {
        querySingle($http, 'DocumentInstance/ApplicableTenure.Organization,ReferenceTenure.Organization,ApplicableTenure.Educator,Fields?DocumentInstanceID=' + $scope.DocumentInstanceID, $scope, 'documentInstance')
            .success(function () {
                $scope.educator = $scope.documentInstance.ApplicableTenure.Educator;
                return querySingle($http, 'DocumentDefinition/Fields?DocumentDefinitionID=' + encodeURIComponent($scope.documentInstance.DocumentDefinitionID), $scope, 'documentDefinition');
            });
    } else {
        $scope.documentInstance = {
            DocumentDefinitionID: $scope.DocumentDefinitionID
        };
        if ($scope.DocumentDefinitionID) {
            querySingle($http, 'DocumentDefinition/Fields?DocumentDefinitionID=' + $scope.DocumentDefinitionID, $scope, 'documentDefinition');
        } else {
            // problem
        }
        if ($scope.EducatorID) {
            querySingle($http, 'Educator/Tenures?EducatorID=' + $scope.EducatorID, $scope, 'educator');
        } else {
            // problem
        }
    }
}

function SubmitForm($scope, $http, $event) {
    $scope.CustomValidationMessages = [];
    if ($scope.CustomValidationMessages.length > 0) {
        $event.preventDefault();
    }
}

