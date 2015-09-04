function ReviewEmployeesController($scope, $http, $location)
{
    FetchData($scope, $http, $location);
    $scope.HasDocument = HasDocument;
    $scope.ValidateDocuments = ValidateDocuments;
    this.DocumentDefinitions = $scope.DocumentDefinitions;
}

function FetchData($scope, $http, $location)
{
    var url1 = 'http://localhost:1337/api/Organization/Tenures.Educator.Documents.Definition?OrganizationID=07489674-98D7-48F2-B357-08AE033E181A';
    $http.get(url1)
        .success(function (data, status, headers, config) {
        $scope.Organization = data[0];
    })
        .error(function (data, status, headers, config) {
        alert('Error ' + status);
    });
    var url2 = 'http://localhost:1337/api/DocumentDefinition';
    $http.get(url2)
        .success(function (data, status, headers, config) {
        $scope.DocumentDefinitions = data;
    })
        .error(function (data, status, headers, config) {
        alert('Error ' + status);
    });
}

function GetDocument(tenure, definition) {
    for (var i = 0; i < tenure.Educator.Documents.length; i++) {
        var doc = tenure.Educator.Documents[i];
        if (doc.Definition.DocumentDefinitionID === definition.DocumentDefinitionID) {
            return doc;
        }
    }
    return null;
}

function HasDocument(tenure, definition) {
    return GetDocument(tenure, definition);
}

function CreateDocumentInstanceHyperlink(tenure, definition) {
    var doc = GetDocument(tenure, definition);
    if (doc) {
        return '<a style="color: red" href="#' + doc.DocumentInstanceID + '>' + doc.Definition.name + '</a>';
    } else {
        return null;
    }
}

function ValidateDocuments(tenure) {
    for (var i = 0; i < this.DocumentDefinitions.length; i++) {
        if (!HasDocument(tenure, this.DocumentDefinitions[i])) {
            return false;
        }
    }
    return true;
}