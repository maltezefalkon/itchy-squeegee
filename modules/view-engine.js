var _ = require('lodash');
var fs = require('fs');
var path = require('path');
var myUrl = require('./myurl');

var cache = {};

module.exports = function (app, viewFolderPath) {

    app.engine('view', function (filePath, options, callback) {
        var compiled = cache[filePath];
        if (!compiled || process.env.BYPASS_VIEW_CACHE) {
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
    app.get('/controllers/:controllerName', function (req, res) {
        var filePath = path.resolve(path.join(path.dirname(require.main.filename), viewFolderPath, req.params.controllerName));
        res.sendFile(req.params.controllerName, { root: 'app/views' });
    });
    app.get('/app/view/:ViewName/:Arguments?', function (req, res, next) {
        var view = req.params.ViewName;
        var dataScriptPath = path.resolve(path.join(path.dirname(require.main.filename), viewFolderPath, view + '.data.js'));
        var arguments = [ req ];
        if (req.params.Arguments) {
            arguments = arguments.concat(req.params.Arguments.split(','));
        }
        var promiseOrData = require(dataScriptPath).apply(null, arguments);
        if (typeof promiseOrData.then == 'function') {
            promiseOrData.then(function (data) {
                renderViewOrHandleError(res, view, data);
            });
        } else {
            renderViewOrHandleError(res, view, promiseOrData);
        }
    });
};


function renderViewOrHandleError(res, view, data) {
    if (data.fatalError) {
        var url = myUrl.createUrl(myUrl.createUrlType.Error, [], { message: data.fatalError }, true);
        res.redirect(url);
    } else if (data.redirect) {
        res.redirect(data.redirect);
    } else {
        res.render(view, data);
    }
}