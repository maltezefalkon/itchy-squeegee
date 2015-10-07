var port = process.env.EXTERNAL_PORT || process.env.PORT || 1337;

module.exports.domainName = process.env.DOMAIN_NAME || 'localhost';
module.exports.domainNameAndPort = module.exports.domainName + (port != 80 && port != '80' ? ':' + port.toString() : '');

module.exports.createUrlType = {
    FillForm: 'FillForm',
    OrganizationDashboard: 'OrganizationDashboard',
    EducatorDashboard: 'EducatorDashboard',
    Error: 'Error',
    EducatorSignup: 'EducatorSignup',
    EducatorTenure: 'EducatorTenure',
    OrganizationSignup: 'OrganizationSignup',
    Login: 'Login',
    Logout: 'Logout',
    Home: 'Home',
    UserSignup: 'UserSignup',
    DownloadForm: 'DownloadForm',
    UploadForm: 'UploadForm'
};

var urls = {
    FillForm: '/app/view/FillForm',
    EducatorDashboard: '/app/view/EducatorDashboard',
    OrganizationDashboard: '/app/view/OrganizationDashboard',
    Error: '/app/view/FatalError',
    EducatorTenure: '/app/view/EducatorTenure',
    EducatorSignup: '/app/view/EducatorSignup',
    OrganizationSignup: '/app/view/OrganizationSignup',
    Login: '/app/view/Login',
    Logout: '/app/user/Logout',
    Home: '/app/view/Home',
    UserSignup: '/app/view/UserSignup',
    DownloadForm: '/app/form/Download',
    UploadForm: '/app/view/UploadForm'
};


function createUrl(type, routeArgArray, queryStringArgObject, relative) {
    var ret = (!relative ? 'http://' + module.exports.domainNameAndPort : '') + urls[type];
    var first = true;
    if (routeArgArray instanceof Array) {
        for (var f in routeArgArray) {
            if (!first) {
                ret += ',';
            } else {
                ret += '/';
                first = false;
            }
            ret += encodeURIComponent(routeArgArray[f]);
        }
    } 
    if (queryStringArgObject instanceof Object) {
        first = true;
        for (var f in queryStringArgObject) {
            if (!first) {
                ret += '&';
            } else {
                ret += '?';
                first = false;
            }
            ret += encodeURIComponent(f) + '=' + encodeURIComponent(queryStringArgObject[f]);
        }
    }
    return ret;
}

module.exports.createUrl = createUrl;

function createDefaultUrl(user) {
    if (user.LinkedOrganizationID) {
        return createUrl(module.exports.createUrlType.OrganizationDashboard);
    } else if (user.LinkedEducatorID) {
        return createUrl(module.exports.createUrlType.EducatorDashboard);
    } else {
        return createUrl(module.exports.createUrlType.Error, [], { message: 'This account has not been set up correctly.  Please contact support for assistance.' });
    }
}

module.exports.createDefaultUrl = createDefaultUrl;
