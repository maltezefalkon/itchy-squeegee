﻿var Logger = require('bunyan');

module.exports = function (logSubject, logFileName) {
    return new Logger({
        name: logSubject || 'app',
        streams: [
            {
                level: 'info',
                stream: process.stdout
            }
        ]
    });
};
