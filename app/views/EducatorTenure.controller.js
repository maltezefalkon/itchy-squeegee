"use strict"

function EducatorSignupController($scope, $http, $location) {
    
    var dict = parseQueryString();
    
    $scope.OrganizationID = dict['OrganizationID'];
    $scope.EducatorID = dict['EducatorID'];
    $scope.UserID = dict['UserID'];
    $scope.IsApplicant = (dict['IsApplicant'] == 'true');
    
    $scope.tenure = { OrganizationSearchFound: false, OrganizationSearchBegun: false, OrganizationSearchComplete: false, EducatorID: $scope.EducatorID };
    $scope.DoneEnteringHistory = undefined;
    $scope.SkipHistory = !$scope.IsApplicant;
    
    FetchData($scope, $http, $location);
    
    // expose public functions
    
    $scope.CreateFieldName = CreateFieldName;
    
    $scope.setSkipHistory = function (skip) {
        SetSkipHistory($scope, $http, skip);
    };
    $scope.searchForOrganization = function (tenureObject) {
        SearchForSchool($scope, $http, tenureObject);
    };
    $scope.setOrganization = function (tenureObject) {
        SetSchool($scope, $http, tenureObject);
    };
    $scope.clearOrganization = function (tenureObject) {
        ClearOrganization($scope, $http, tenureObject);
    }
    $scope.createOrganization = function (tenureObject) {
        CreateOrganization($scope, $http, tenureObject);
    };
    $scope.submitForm = function ($event) {
        SubmitForm($scope, $http, $event);
    }
    $scope.setDoneEnteringHistory = function (done) {
        SetDoneEnteringHistory($scope, $http, done);
    }
}

function CompareTo() {
    return {
        require: "ngModel",
        scope: {
            otherModelValue: "=compareTo"
        },
        link: function (scope, element, attributes, ngModel) {
            
            ngModel.$validators.compareTo = function (modelValue) {
                return modelValue == scope.otherModelValue;
            };
            
            scope.$watch("otherModelValue", function () {
                ngModel.$validate();
            });
        }
    };
}

function FetchData($scope, $http, $location) {
    if ($scope.EducatorID) {
        querySingle($http, 'Educator?EducatorID=' + $scope.EducatorID, $scope, 'educator');
    }
    if ($scope.OrganizationID) {
        querySingle($http, 'Organization?OrganizationID=' + $scope.OrganizationID, $scope, 'organization');
    }
    if ($scope.UserID) {
        querySingle($http, 'User?UserID=' + $scope.UserID, $scope, 'user');
    }
}

function CreateFieldName(f) {
    return f.DocumentDefinitionFieldID;
}

function SearchForSchool($scope, $http, tenureObject) {
    var text = tenureObject.OrganizationSearchName;
    tenureObject.OrganizationSearchBegun = text && text.length > 2;
    if (tenureObject.OrganizationSearchBegun) {
        queryList($http, 'Organization/query/SchoolSearch/?term=' + encodeURIComponent(text), tenureObject, 'OrganizationSearchList')
            .then(function () {
            updateSearch(tenureObject);
        });
    } else {
        tenureObject.OrganizationSearchList = [];
        tenureObject.Organization = null;
        tenureObject.OrganizationSearchComplete = false;
        tenureObject.OrganizationSearchFound = false;
    }
}

function SetSchool($scope, $http, tenureObject) {
    tenureObject.Organization = tenureObject.OrganizationSearchList[0];
    tenureObject.OrganizationSearchComplete = true;
}

function CreateOrganization($scope, $http, tenureObject) {
    tenureObject.Organization = { Name: tenureObject.OrganizationSearchName };
    tenureObject.OrganizationSearchComplete = true;
}

function ClearOrganization($scope, $http, tenureObject) {
    tenureObject.OrganizationSearchList = [];
    tenureObject.Organization = null;
    tenureObject.OrganizationSearchBegun = false;
    tenureObject.OrganizationSearchComplete = false;
    tenureObject.OrganizationSearchFound = false;
    tenureObject.OrganizationSearchName = '';
}

function updateSearch(tenureObject) {
    tenureObject.Organization = null;
    tenureObject.OrganizationSearchComplete = false;
    if (tenureObject.OrganizationSearchList.length == 1) {
        tenureObject.OrganizationSearchName = tenureObject.OrganizationSearchList[0].Name;
        tenureObject.OrganizationSearchFound = true;
    } else {
        tenureObject.OrganizationSearchFound = false;
    }
}

function SubmitForm($scope, $http, $event) {
    $scope.CustomValidationMessages = [];
    if (!$scope.tenure.Organization) {
        if ($scope.tenure.OrganizationSearchBegun) {
            if ($scope.tenure.OrganizationSearchFound) {
                $scope.CustomValidationMessages.push('Please click the button to confirm that the employer name is correct.');
            } else {
                $scope.CustomValidationMessages.push('Please click the button to enter the details for this employer.');
            }
        }
    }
    if ($scope.CustomValidationMessages.length > 0) {
        $event.preventDefault();
    }
}

function SetDoneEnteringHistory($scope, $http, done) {
    $scope.DoneEnteringHistory = done;
}

function SetSkipHistory($scope, $http, skip) {
    $scope.SkipHistory = skip;
}

