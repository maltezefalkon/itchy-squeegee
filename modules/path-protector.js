module.exports.createMiddleware = function (publicPaths, loginPagePath, apiPath) {
    
    var ppRegex = [];
    publicPaths.forEach(function (x) {
        var replaced = x.replace(/\//g, '\\/').replace(/\*/g, '([^\\/]+?)');
        ppRegex.push(new RegExp('^' + replaced));
    });
    // redirect if requesting a protected page and the user is not authenticated
    return function (req, res, next) {
        var publicPath = false;
        var compare = req.path;
        if (compare.substr(-1) != '/') {
            compare += '/';
        }
        for (var i = 0; i < ppRegex.length; i++) {
            if (ppRegex[i].test(compare)) {
                publicPath = true;
                break;
            }
        }
        if (!publicPath && !req.isAuthenticated()) {
            if (compare.indexOf(apiPath) == 0) {
                return res.send([]);
            } else {
                return res.redirect(loginPagePath);
            }
        } else {
            next();
        }
    };
}