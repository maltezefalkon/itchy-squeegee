﻿function EducatorDashboardController($scope, $http, $location, Status) {
    
    var dict = parseQueryString();
    
    $scope.EducatorID = dict['EducatorID'];
    $scope.TenureFilter = {
        EndDate: null
    };

    FetchData($scope, $http);

    $scope.getSortPriority = GetSortPriority;
    $scope.isApplication = IsApplication;
    $scope.isCurrentTenure = IsCurrentTenure;
    $scope.formatDate = FormatDate;
    $scope.$location = $location;
    $scope.Status = Status;

    $scope.navigateToFormFill = function (document) {
        NavigateToFormFill($scope, $location, document);
    }
    $scope.navigateToFormDownload = function (document) {
        NavigateToFormDownload($scope, $location, document);
    }
    $scope.navigateToFormUpload = function (document) {
        NavigateToFormUpload($scope, $location, document);
    }
}

function FetchData($scope, $http) {
    queryList($http, 'DocumentDefinition/Fields', $scope, 'documentDefinitions');
    querySingle($http, 'Educator/Tenures.Organization,Tenures.ApplicableDocuments.Definition,Tenures.ReferenceDocuments.Definition?EducatorID=' + $scope.EducatorID, $scope, 'educator')
        .success(function () {
            $scope.outstandingApplications = GetOutstandingApplications($scope.educator);
            $scope.currentTenures = GetCurrentTenures($scope.educator);
        });
}

function IsApplication(tenure) {
    return !tenure.StartDate && !tenure.EndDate;
}

function IsCurrentTenure(tenure) {
    return tenure.StartDate && !tenure.EndDate;
}

function GetSortPriority(tenure) {
    if (IsApplication(tenure)) {
        return 1;
    } else if (IsCurrentTenure(tenure)) {
        return 2;
    } else {
        return 3;
    }
}

function GetOutstandingApplications(educator) {
    var ret = []
    for (var i = 0; i < educator.Tenures.length; i++) {
        if (IsApplication(educator.Tenures[i])) {
            ret.push(educator.Tenures[i]);
        }
    }
    return ret;
}

function GetCurrentTenures(educator) {
    var ret = []
    for (var i = 0; i < educator.Tenures.length; i++) {
        if (educator.Tenures[i].StartDate && !educator.Tenures[i].EndDate) {
            ret.push(educator.Tenures[i]);
        }
    }
    return ret;
}

function GetDocuments(tenure, documentDefinitionID) {
    var ret = [];
    for (var i = 0; i < tenure.ReferenceDocuments.length; i++) {
        if (tenure.ReferenceDocuments[i].DocumentDefinitionID == documentDefinitionID) {
            ret.push(tenure.ReferenceDocuments[i]);
        }
    }
    return ret;
}

function FormatDate(d) {
    if (!d) {
        return null;
    } else {
        var date = (d instanceof Date) ? d : new Date(d);
        return (date.getMonth() + 1).toString() + '/' + date.getDate() + '/' + date.getFullYear();
    }
}

function NavigateToFormFill($scope, $location, document) {
    var newPath = '/app/protected/FillForm.html?DocumentInstanceID=' + document.DocumentInstanceID + '&Section=Educator';
    console.log(newPath);
    location.href = newPath;
}

function NavigateToFormDownload($scope, $location, document) {
    var newPath = '/app/form/Download/' + document.DocumentInstanceID;
    console.log(newPath);
    location.href = newPath;
}

function NavigateToFormUpload($scope, $location, document) {
    var newPath = '/app/protected/UploadForm.html?DocumentInstanceID=' + document.DocumentInstanceID + '&Section=Educator'
    console.log(newPath);
    location.href = newPath;
}
