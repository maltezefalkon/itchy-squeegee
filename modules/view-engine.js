var _ = require('lodash');
var fs = require('fs');

var cache = {};

module.exports = function (app, viewFolderPath) {

    app.engine('view', function (filePath, options, callback) {
        var compiled = cache[filePath];
        if (!compiled) {
            fs.readFile(filePath, function (err, content) {
                if (err) return callback(new Error(err));
                cache[filePath] = _.template(content);
                return callback(null, cache[filePath](options))
            });
        } else {
            var rendered = compiled(options);
            return callback(null, rendered);
        }
    });

    app.set('view engine', 'view');
    app.set('views', viewFolderPath);
};

