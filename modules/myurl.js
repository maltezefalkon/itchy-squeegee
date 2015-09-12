var port = require('./port.js');

module.exports.domainName = process.env.DOMAIN_NAME || 'localhost';
module.exports.domainNameAndPort = module.exports.domainName + ':' + port;
module.exports.createUrlType = {
    FormFill: 'FormFill',
    OrganizationDashboard: 'OrganizationDashboard',
    EducatorDashboard: 'EducatorDashboard',
    Error: 'Error'
};

var urls = {
    FormFill: '/app/protected/FillForm.html',
    EducatorDashboard: '/app/protected/EducatorDashboard.html',
    OrganizationDashboard: '/app/protected/ReviewEmployees.html',
    Error: '/app/public/FatalError.html'
};

module.exports.createUrl = function (type, args, relative) {
    var ret = (!relative ? 'http://' + module.exports.domainNameAndPort : '') + urls[type];
    if (args) {
        var first = true;
        ret += '?';
        for (var f in args) {
            if (!first) {
                ret += '&';
            } else {
                first = false;
            }
            ret += f + '=' + encodeURIComponent(args[f]);
        }
    }
    return ret;
}