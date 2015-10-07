"use strict"

function UserSignupController($scope, $http, $location, educatorID, organizationID) {
    
    $scope.OrganizationID = organizationID;
    $scope.EducatorID = educatorID;
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
