var cookieParser = require('cookie-parser');
var api = require('./api.js');
var bcrypt = require('bcryptjs');
var myUrl = require('./myurl.js');
var log = require('./logging.js')('session-management');

module.exports.createMiddleware = function (publicPathPatterns, loginPagePath) {
    return function (req, res, next) {
        var publicPath = false;
        var compare = req.path;
        for (var i = 0; i < publicPathPatterns.length; i++) {
            if (publicPathPatterns[i].test(compare)) {
                publicPath = true;
                break;
            }
        }
        req.publicPath = publicPath;
        var sessionID = req.signedCookies.sessionID;
        if (req.session) {
            sessionID = req.session.SessionID;
        }
        if (!publicPath && !sessionID) {
            res.redirect(loginPagePath);
        } else {
            api.querySingle('UserSession', ['User.LinkedOrganization', 'User.LinkedEducator'], null, { SessionID: sessionID })
                .then(function (sessionObject) {
                if (sessionObject) {
                    req.session = sessionObject;
                    req.user = sessionObject.User;
                }
                next();
            });
        }
    };
}

module.exports.createLoginHandler = function (loginPagePath) {
    return function (req, res, next) {
        var data = req.body; // assumes body-parser is in place
        api.querySingle('User', ['LinkedOrganization', 'LinkedEducator'], null, { UserName: data.username })
            .then(function (user) {
            if (user && bcrypt.compareSync(data.password, user.Hash)) {
                return CreateSession(user, req, res, next).then(function () {
                    var url = myUrl.createDefaultUrl(user);
                    res.redirect(url);
                });
            } else {
                res.redirect(loginPagePath + '?Message=' + encodeURIComponent('User not found or incorrect password.'));
            }
        });
    };
}

module.exports.createLogoutHandler = function (afterLogoutPath) {
    return function (req, res, next) {
        log.info({ user: req.user, session: req.session }, 'Logging out');
        req.session.destroy().then(function () {
            log.info('Logged out');
            res.clearCookie('sessionID');
            res.redirect(afterLogoutPath);
        });
    };
}

module.exports.createUserAccountCreationHandler = function () {
    return function (req, res, next) {
        var data = req.body; // assumes body-parser is in place
        var entityType = req.params.entityType;
        var entityID = req.params.entityID;
        var hash = bcrypt.hashSync(data.Password);
        var user = {
            _TypeKey: 'User',
            EmailAddress: data.EmailAddress,
            UserName: data.EmailAddress,
            Hash: hash
        };
        api.save(user)
            .then(function () {
                return CreateSession(user, req, res, next).then(function () {
                    next();
                });
            });
        };
}

function CreateSession(user, req, res, next) {
    var session = {
        _TypeKey: 'UserSession',
        UserID: user.UserID,
        SessionStart: new Date()
    };
    return api.save(session).then(function () {
        req.session = session;
        req.user = user;
        res.cookie('sessionID', session.SessionID, { signed: true, httpOnly: true });
    });
}

module.exports.createSession = CreateSession;
