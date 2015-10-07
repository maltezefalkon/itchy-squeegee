"use strict"

function OrganizationSignupController($scope, $http, $location, organization, user) {
    
    var dict = parseQueryString();
    $scope.OrganizationID = dict['OrganizationID'];
    $scope.UserID = dict['UserID'];
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
