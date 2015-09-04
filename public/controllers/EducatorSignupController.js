function EducatorSignupController($scope, $http, $location) {
    var dict = parseQueryString();
    $scope.OrganizationID = dict['OrganizationID'];
    $scope.OrganizationSupplied = Boolean(dict['OrganizationID']);
    $scope.Tenures = [];
    $scope.CreateFieldName = CreateFieldName;
    $scope.addNewTenure = AddNewTenure;
    FetchData($scope, $http, $location);
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
    queryList('OrganizationList', 'Organization', $scope, $http);
    querySingle('FormDefinition', 'DocumentDefinition/Fields?DocumentDefinitionID=093076b1-3348-11e5-9a89-180373ea70a8', $scope, $http);
}

function CreateFieldName(f) {
    return f.DocumentDefinitionFieldID;
}

function AddNewTenure() {
    var newTenure = { organizationType: 'School' };
    if (this.Tenures.length == 0)
    {
        newTenure.PresentEmployer = true;
    }
    this.Tenures.push(newTenure);
}