"use strict"

function UserSignupController($scope, $http, $location) {
    var dict = parseQueryString();
    $scope.Message = dict.Message;
    
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
