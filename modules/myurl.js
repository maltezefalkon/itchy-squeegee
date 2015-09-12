var port = require('./port.js');

module.exports.domainName = process.env.DOMAIN_NAME || 'localhost';
module.exports.domainNameAndPort = module.exports.domainName + ':' + port;
module.exports.createUrlType = {
    FormFill: 'FormFill'
};

var urls = {
    FormFill: '/form/fill/'
};

module.exports.createUrl = function (type, args) {
    var ret = 'http://' + module.exports.domainNameAndPort + urls[type];
    if (args) {
        ret += '?';
        for (var f in args) {
            ret += f + '=' + args[f];
        }
    }
    return ret;
}