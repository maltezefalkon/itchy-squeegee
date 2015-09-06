function EducatorDashboardController($scope, $http, $location) {
    var dict = parseQueryString();
    $scope.EducatorID = dict['EducatorID'];

    FetchData($scope, $http);
}

function FetchData($scope, $http) {
    queryList($http, 'DocumentDefinition/Fields', $scope, 'documentDefinitions');
    querySingle($http, 'Educator/LinkedUser,Tenures.Organization,Tenures.ApplicationDocuments,Tenures.ReferenceDocuments?EducatorID=' + $scope.EducatorID, $scope, 'educator')
        .success(function () {
            $scope.outstandingApplications = GetOutstandingApplications($scope.educator);
            $scope.currentTenures = GetCurrentTenures($scope.educator);
        });
}

function GetOutstandingApplications(educator) {
    var ret = []
    for (var i = 0; i < educator.Tenures.length; i++) {
        if (!educator.Tenures[i].StartDate && !educator.Tenures[i].EndDate) {
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