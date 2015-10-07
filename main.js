﻿/*
 * MAIN
 */

"use strict"

// imports
var express = require('express');
var dataServices = require('./services/dataserver.js');
var signupServices = require('./services/signupserver.js');
var formServices = require('./services/formserver.js');
var log = require('./modules/logging')('main');
var requestLog = require('./modules/logging')('requests');
var bodyParser = require('body-parser');
var port = require('./modules/port.js');
var cookieParser = require('cookie-parser');
var sessionManagement = require('./modules/session-management.js');
var myUrl = require('./modules/myurl.js');

log.info('initializing');

// set up our web app
var app = express();

// =============
// MIDDLEWARE

var loginPath = '/app/view/Login';
var publicPaths = [
    /^\/$/i, 
    /^\/client\//i, 
    /^\/controllers\//i, 
    /^\/app\/view\/Login$/i, 
    /^\/app\/view\/Home$/i, 
    /^\/app\/view\/UserSignup\/?/i,
    /^\/app\/user\/Signup\/?/i,
    /^\/favicon.ico$/i,
    /^\/app\/view\/FatalError\/?$/i,
    /^\/app\/user\/Login\/?$/i,
    /^\/app\/public\/(\w+).html/i
];

log.info('setting up middleware');

// log all requests
app.use(function (req, res, next) {
    requestLog.debug({ method: req.method, url: req.url, headers: req.headers, user: req.user });
    next();
});

// set up cookie parsing and body parsing for all paths
app.use(cookieParser('doralia-x-e3'));
app.use(bodyParser.urlencoded({ extended: false }));

app.use('/client', express.static('app'));

app.use(sessionManagement.createMiddleware(publicPaths, loginPath));

// api URLs should use the JSON body parser
app.use('/api', bodyParser.json({ strict: true }));


// ============
// ROUTES

log.info('setting up routes');

// view engine
require('./modules/view-engine.js')(app, '/app/views');

app.get('/', function (req, res, next) {
    res.redirect(myUrl.createUrl(myUrl.createUrlType.Home));
});

/*
// API routes
app.get('/api/:type/:joins?', dataServices.getData);
app.post('/api/:type?', dataServices.postData);
*/
app.get('/api/:type/query/:query/:joins?', dataServices.getData);

// user management routes
app.post('/app/user/login', sessionManagement.createLoginHandler(loginPath));
app.get('/app/user/logout', sessionManagement.createLogoutHandler(loginPath));

// form routes
app.post('/app/view/FillForm/:documentInstanceID', formServices.postFormData);
app.get('/app/form/Download/:DocumentInstanceID', formServices.getPDFForm);

// signup routes
app.post('/app/view/UserSignup/:invitationID?', signupServices.postUserSignupData);
app.post('/app/view/OrganizationSignup/:invitationID', signupServices.postOrganizationSignupData);
app.post('/app/view/EducatorSignup/:invitationID?', signupServices.postEducatorSignupData);
app.post('/app/view/EducatorTenure/:invitationID?', signupServices.postEducatorTenureData);

// =============

// start listening for requests on port 1337 (by default)
app.listen(port);

log.info('setup done; listening on port ' + port);

// =============
