function HeaderController($scope, $location) {
    $scope.isActive = function (viewLocation) {
        return document.location.pathname.indexOf(viewLocation) == 0;
    };
}