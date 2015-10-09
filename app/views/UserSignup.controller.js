"use strict"

function UserSignupController($scope, $http, $location) {
    var dict = parseQueryString();
    $scope.Message = dict.Message;
    
    // expose public functions
    $scope.submitForm = function ($event) {
        SubmitForm($scope, $http, $event);
    }

    $scope.hasLowercase = function (value) {
        return !value || Boolean(value.match(/[a-z]/));
    }

    $scope.hasUppercase = function (value) {
        return !value || Boolean(value.match(/[A-Z]/));
    }

    $scope.hasNumber = function (value) {
        return !value || Boolean(value.match(/[0-9]/));
    }

    $scope.confirmMatch = function (value, compare) {
        return !value || value == compare;
    }

    $scope.minimumLength = function (value) {
        return !value || value.length >= 6;
    }
}

function SubmitForm($scope, $http, $event) {
    if (!$event.$valid) {
        $event.preventDefault();
    }
}
