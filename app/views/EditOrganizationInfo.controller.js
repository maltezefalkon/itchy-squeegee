"use strict"

function EditOrganizationInfoController($scope, $http, $location, organization, user) {
    
    $scope.organization = organization;
    $scope.user = user;

    // expose public functions
    
    $scope.submitForm = function ($event) {
        SubmitForm($scope, $http, $event);
    }
}

function SubmitForm($scope, $http, $event) {
    $scope.CustomValidationMessages = [];
    if ($scope.CustomValidationMessages.length > 0) {
        $event.preventDefault();
    }
}
