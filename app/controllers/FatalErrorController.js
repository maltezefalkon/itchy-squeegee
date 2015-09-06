function FatalErrorController($scope, $http, $location) {
    var dict = parseQueryString();
    $scope.Message = dict.message;
}
