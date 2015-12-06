var port = process.env.EXTERNAL_PORT || process.env.PORT || 1337;

module.exports.domainName = process.env.DOMAIN_NAME || 'localhost';
module.exports.domainNameAndPort = module.exports.domainName + (port != 80 && port != '80' ? ':' + port.toString() : '');

module.exports.createUrlType = {
    FillForm: 'FillForm',
    CreateForm: 'CreateForm',
    OrganizationDashboard: 'OrganizationDashboard',
    EducatorDashboard: 'EducatorDashboard',
    Error: 'Error',
    Hold: 'Hold',
    EducatorSignup: 'EducatorSignup',
    EducatorTenure: 'EducatorTenure',
    EducatorDocuments: 'EducatorDocuments',
    OrganizationSignup: 'OrganizationSignup',
    Login: 'Login',
    Logout: 'Logout',
    About: 'About',
    Contact: 'Contact',
    Home: 'Home',
    UserSignup: 'UserSignup',
    DownloadForm: 'DownloadForm',
    UploadForm: 'UploadForm',
    ApiCommand: 'ApiCommand',
    TestEmail: 'TestEmail',
    ConfirmUser: 'ConfirmUser',
    EditOrganizationInfo: 'EditOrganizationInfo'
};

var urls = {
    FillForm: '/app/view/FillForm',
    CreateForm: '/app/form/CreateForm',
    EducatorDashboard: '/app/view/EducatorDashboard',
    OrganizationDashboard: '/app/view/OrganizationDashboard',
    Error: '/app/view/FatalError',
    Hold: '/app/view/Hold',
    EducatorTenure: '/app/view/EducatorTenure',
    EducatorSignup: '/app/view/EducatorSignup',
    EducatorDocuments: '/app/view/EducatorDocuments',
    OrganizationSignup: '/app/view/OrganizationSignup',
    Login: '/app/view/Login',
    Logout: '/app/user/Logout',
    About: '/app/view/About',
    Contact: '/app/view/Contact',
    Home: '/app/view/Home',
    UserSignup: '/app/view/UserSignup',
    DownloadForm: '/app/form/Download',
    UploadForm: '/app/form/Upload',
    ApiCommand: '/api/command',
    TestEmail: '/app/view/TestEmail',
    ConfirmUser: '/app/user/Confirm',
    EditOrganizationInfo: '/app/view/EditOrganizationInfo'
};


function createUrl(type, routeArgArray, queryStringArgObject, relative) {
    var ret = (!relative ? 'http://' + module.exports.domainNameAndPort : '') + urls[type];
    var first = true;
    if (routeArgArray instanceof Array) {
        for (var f in routeArgArray) {
            if (!first) {
                ret += ';';
            } else {
                ret += '/';
                first = false;
            }
            if (routeArgArray[f]) {
                ret += encodeURIComponent(routeArgArray[f]);
            }
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
