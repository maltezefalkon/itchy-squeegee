﻿// imports
var passport = require('passport');
var meta = require('./metadata.js')();
var log = require('./logging.js')('authentication');
var uuid = require('uuid');
var session = require('express-session');
var passportLocal = require('passport-local');
var bcrypt = require('bcryptjs');
var pathProtector = require('./path-protector.js');

var LocalStrategy = passportLocal.Strategy;

module.exports = function (app, publicPaths, apiPath, loginHandlerPath, loginPagePath, defaultPageHandler) {
    app.use(session({ genid: function (req) { return uuid(); }, secret: 'doralia-x-e3', saveUninitialized: false, resave: false }));
    app.use(passport.initialize());
    app.use(passport.session());
    setupStrategy(app, loginHandlerPath);
    app.use(pathProtector.createMiddleware(publicPaths, '/app/views/login', '/api'));

    // login handling function
    app.post(loginHandlerPath, function (req, res, next) {
        passport.authenticate('local', function (err, user, info, status) {
            log.info({ err: err, user: user, info: info, status: status }, 'authentication callback called');
            if (err) {
                return next(err);
            } else if (!user) {
                var username = req.body.username;
                return res.redirect(loginPagePath + '?message=' + encodeURIComponent(info.message) + '&UserName=' + encodeURIComponent(username));
            } else {
                req.logIn(user, function (err) {
                    if (err) {
                        return next(err);
                    } else {
                        return defaultPageHandler(req, res, next);
                    }
                });
            }
        })(req, res, next);
    });
    return passport;
};

function setupStrategy(app, path) {
    passport.use('local', new LocalStrategy(
        { usernameField: 'username', passwordField: 'password' },
        function (username, password, done) {
            log.debug({ username: username, password: password, done: done }, 'LocalStrategy authentication method invoked');
            var query = { where: { UserName: username } };
            meta.db.User.findOne(query)
                .then(function (user) {
                        log.debug({ user: user }, 'user retrieved successfully');
                        if (!user) {
                            log.debug('user not found');
                            done(null, false, { message: 'User not found' });
                        } else if (bcrypt.compareSync(password, user.Hash)) {
                            log.debug('password matched');
                            done(null, user);
                        } else {
                            done(null, false, { message: 'Incorrect password.' });
                        }
                    })
                .catch(function (err) {
                        log.error({ error: err }, 'Error retrieving user');
                        done(null, false, { message: 'Error retrieving user: ' + err, err: err });
                    });
        }
    ));
    
    passport.serializeUser(function (req, user, done) {
        log.debug({ user: user }, 'serializeUser called (object version)');
        done(null, user);
    });
    passport.deserializeUser(function (req, user, done) {
        log.debug({ user: user, req: req }, 'deserializeUser called (object version)');
        done(null, user);
    });
}