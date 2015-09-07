var form168DefinitionID = '093076b1-3348-11e5-9a89-180373ea70a8';

function EducatorDashboardController($scope, $http, $location) {
    
    var dict = parseQueryString();
    
    $scope.EducatorID = dict['EducatorID'];
    $scope.TenureFilter = {
        EndDate: null
    };
    
    FetchData($scope, $http);

    $scope.getStatus = GetStatus;
    $scope.getSortPriority = GetSortPriority;
    $scope.isApplication = IsApplication;
    $scope.isCurrentTenure = IsCurrentTenure;

}

function FetchData($scope, $http) {
    queryList($http, 'DocumentDefinition/Fields', $scope, 'documentDefinitions');
    querySingle($http, 'Educator/LinkedUser,Tenures.Organization,Tenures.ApplicableDocuments,Tenures.ReferenceDocuments?EducatorID=' + $scope.EducatorID, $scope, 'educator')
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

function GetStatus(tenure, documentDefinition) {
    var docs = GetDocument(tenure, documentDefinition.DocumentDefinitionID);
    if (docs.length == 0) {
        return "missing";
    } else {
        return "???";
    }
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