var _ = require('lodash');
var fs = require('fs');
var path = require('path');

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
    app.set('views', path.join(path.dirname(require.main.filename), viewFolderPath));
    app.get('/app/view/:ViewName/:Arguments?', function (req, res, next) {
        var view = req.params.ViewName;
        var arguments = req.params.Arguments ? req.params.Arguments.split(',') : [];
        var dataScriptPath = path.resolve(path.join(path.dirname(require.main.filename), viewFolderPath, view + '.data.js'));
        var promiseOrData = require(dataScriptPath).apply(null, arguments);
        if (typeof promiseOrData.then == 'function') {
            promiseOrData.then(function (data) {
                res.render(view, data);
            });
        } else {
            res.render(view, promiseOrData);
        }
    });

};

