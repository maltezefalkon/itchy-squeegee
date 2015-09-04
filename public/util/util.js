var baseDataUrl = 'http://localhost:1337/api/';

function parseQueryString() {
    var args = document.location.search.substring(1).split('&');
    var ret = {};

    for (i = 0; i < args.length; i++) {
        var arg = decodeURIComponent(args[i]);

        if (arg.indexOf('=') == -1) {
            ret[arg.trim()] = true;
        }
        else {
            var kvp = arg.split('=');
            ret[kvp[0].trim()] = kvp[1].trim();
        }
    }
    return ret;
}

function queryList(scopePropertyName, path, $scope, $http) {
    var requestUrl = baseDataUrl + path;
    return $http.get(requestUrl)
        .success(function (data, status, headers, config) {
            $scope[scopePropertyName] = data;
        })
        .error(function (data, status, headers, config) {
            alert('Error retrieving ' + scopePropertyName + ': ' + status);
        });
}

function querySingle(scopePropertyName, path, $scope, $http) {
    var requestUrl = baseDataUrl + path;
    return $http.get(requestUrl)
        .success(function (data, status, headers, config) {
            $scope[scopePropertyName] = data[0];
        })
        .error(function (data, status, headers, config) {
            alert('Error retrieving ' + scopePropertyName + ': ' + status);
        });
}

