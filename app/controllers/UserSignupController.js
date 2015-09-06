"use strict"

function UserSignupController($scope, $http, $location) {

    var dict = parseQueryString();
    $scope.OrganizationID = dict['OrganizationID'];
    $scope.EducatorID = dict['EducatorID'];
    $scope.EmailAddress = dict['EmailAddress'];
    if ($scope.EmailAddress) {
        $scope.user = {
            EmailAddress: $scope.EmailAddress
        }
    }
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
