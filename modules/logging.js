var Logger = require('bunyan');

module.exports = function (logName) {
    return new Logger({
        name: logName || 'app',
        streams: [
            {
                level: 'debug',
                path: './log/' + (logName || 'app' ) + '.log'
            }
        ]
    });
};
