var port = require('./port.js');

module.exports.domainName = process.env.DOMAIN_NAME || 'localhost';
module.exports.domainNameAndPort = module.exports.domainName + ':' + port;

