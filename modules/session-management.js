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
                } else if (!publicPath) {
                    res.redirect(loginPagePath);
                }
                next();
            });
        }
    };
}

module.exports.createLoginHandler = function (loginPagePath) {
    var nextUrl = null;
    return function (req, res, next) {
        var data = req.body; // assumes body-parser is in place
        api.querySingle('User', ['LinkedOrganization', 'LinkedEducator'], null, { UserName: data.username })
            .then(function (user) {
            if (user) {
                if (user.Disabled) {
                    nextUrl = loginPagePath + '?Message=' + encodeURIComponent('This user account is no longer active.');
                } else if (!user.Confirmed) {
                    nextUrl = loginPagePath + '?Message=' + encodeURIComponent('This user account has not yet been activated.  Please check your email.');
                } else if (!bcrypt.compareSync(data.password, user.Hash)) {
                    nextUrl = loginPagePath + '?Message=' + encodeURIComponent('Incorrect password.');
                } else {
                    return CreateSession(user, req, res, next).then(function () {
                        var url = myUrl.createDefaultUrl(user);
                        res.redirect(url);
                    });
                }
            } else {
                res.redirect(loginPagePath + '?Message=' + encodeURIComponent('User not found.'));
            }
            res.redirect(nextUrl);
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
