function LoginController($scope, $http, $location) {
    var dict = parseQueryString();
    $scope.Message = dict.Message;
    $scope.UserID = dict.UserID;
    $scope.UserName = dict.UserName;
}
