var baseDataUrl = '/api/';

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

function queryList($http, path, localScope, scopePropertyName) {
    var requestUrl = baseDataUrl + path;
    var ret = $http.get(requestUrl)
        .success(function (data, status, headers, config) {
            if (localScope && scopePropertyName) {
                localScope[scopePropertyName] = data;
            }
            return data;
        })
        .error(function (data, status, headers, config) {
            alert('Error retrieving ' + scopePropertyName + ': ' + status);
        });
    return ret;
}

function querySingle($http, path, localScope, scopePropertyName) {
    var requestUrl = baseDataUrl + path;
    var ret = $http.get(requestUrl)
        .success(function (data, status, headers, config) {
            if (localScope && scopePropertyName) {
                localScope[scopePropertyName] = data[0];
            }
            return data[0];
        })
        .error(function (data, status, headers, config) {
            alert('Error retrieving ' + scopePropertyName + ': ' + status);
        });
    return ret;
}

function getFormattedDate(date) {
    var year = date.getFullYear();
    var month = (1 + date.getMonth()).toString();
    month = month.length > 1 ? month : '0' + month;
    var day = date.getDate().toString();
    day = day.length > 1 ? day : '0' + day;
    return month + '/' + day + '/' + year;
}

