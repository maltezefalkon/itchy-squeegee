"use strict"

function OrganizationSignupController($scope, $http, $location) {

    var dict = parseQueryString();
    $scope.OrganizationID = dict['OrganizationID'];
    $scope.UserID = dict['UserID'];

    FetchData($scope, $http, $location);

    // expose public functions

    $scope.submitForm = function ($event) {
        SubmitForm($scope, $http, $event);
    }
}

function FetchData($scope, $http, $location) {
    if ($scope.OrganizationID) {
        querySingle($http, 'Organization?OrganizationID=' + $scope.OrganizationID, $scope, 'organization');
    }
    if ($scope.UserID) {
        querySingle($http, 'User?UserID=' + $scope.UserID, $scope, 'user');
    }
}

function SubmitForm($scope, $http, $event) {
    $scope.CustomValidationMessages = [];
    if ($scope.CustomValidationMessages.length > 0) {
        $event.preventDefault();
    }
}
