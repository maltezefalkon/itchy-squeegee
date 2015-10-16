"use strict"

function EducatorSignupController($scope, $http, $location, educator, invitationType) {
    
    $scope.educator = educator;
    $scope.isApplicant = (invitationType == 3);
    $scope.skipHistory = String(invitationType == 1 || invitationType == 2);
}
