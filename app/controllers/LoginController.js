function LoginController($scope, $http, $location) {
    var dict = parseQueryString();
    $scope.Message = dict.message;
    $scope.UserID = dict.UserID;
    $scope.UserName = dict.UserName;
}
