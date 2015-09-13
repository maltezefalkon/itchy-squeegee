function ReviewEmployeesController($scope, $http, $location)
{
    var query = parseQueryString();

    $scope.OrganizationID = query.OrganizationID;

    FetchData($scope, $http, $location);
    this.DocumentDefinitions = $scope.DocumentDefinitions;

    $scope.applicantLink = createApplicantLink($location.host(), $location.port(), $scope.OrganizationID);
    $scope.employeeLink = createEmployeeLink($location.host(), $location.port(), $scope.OrganizationID);

    // public functions 
    $scope.HasDocument = HasDocument;
    $scope.ValidateDocuments = ValidateDocuments;
    $scope.GetMinimumStatus = GetMinimumStatus;
}

function FetchData($scope, $http, $location)
{
    if ($scope.OrganizationID) {
        querySingle($http, 'Organization/Tenures.Educator.Documents.Definition?OrganizationID=' + $scope.OrganizationID, $scope, 'organization');
    }
    queryList($http, 'DocumentDefinition', $scope, 'DocumentDefinitions');
}

function GetDocuments(tenure, definition) {
    var ret = [];
    for (var i = 0; i < tenure.Educator.Documents.length; i++) {
        var doc = tenure.Educator.Documents[i];
        if (doc.Definition.DocumentDefinitionID === definition.DocumentDefinitionID) {
            ret.push(doc);
        }
    }
    return null;
}

function HasDocument(tenure, definition) {
    return GetMinimumStatus(tenure, definition).IsComplete;
}

function GetMinimumStatus(tenure, definition) {
    var ret = undefined;
    for (var i in tenure.ApplicableDocuments) {
        if (tenure.ApplicableDocuments[i].DocumentDefinitionID = definition.DocumentDefinitionID) {
            if (!ret || ret.ID > tenure.ApplicableDocuments[i].StatusID) {
                ret = {
                    ID: tenure.ApplicableDocuments[i].StatusID,
                    Description: tenure.ApplicableDocuments[i].StatusDescription,
                    IsComplete: Status.LookupByID(tenure.ApplicableDocuments[i].StatusID).IsComplete
                };
            }
        }
    }
    return ret;
}

function ValidateDocuments(tenure) {
    for (var i = 0; i < this.DocumentDefinitions.length; i++) {
        if (!HasDocument(tenure, this.DocumentDefinitions[i])) {
            return false;
        }
    }
    return true;
}

function createEmployeeLink(host, port, organizationID) {
    return "http://" + host + ":" + port + "/user/signup/Educator/?OrganizationID=" + encodeURIComponent(organizationID);
}

function createApplicantLink(host, port, organizationID) {
    return "http://" + host + ":" + port + "/user/signup/Applicant/?OrganizationID=" + encodeURIComponent(organizationID);
}

