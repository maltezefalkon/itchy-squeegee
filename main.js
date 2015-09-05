/*
 * MAIN
 */

"use strict"

// imports
var express = require('express');
var dataServices = require('./services/dataserver.js');
var signupServices = require('./services/signupserver.js');
var log = require('./modules/logging')('main');
var requestLog = require('./modules/logging')('requests');
var bodyParser = require('body-parser');
var port = require('./modules/port.js');
var cookieParser = require('cookie-parser');

log.info('initializing');

// set up our web app
var app = express();

// =============
// MIDDLEWARE

log.info('setting up middleware');

// log all requests
app.use(function (req, res, next) {
    requestLog.debug({ method: req.method, url: req.url, headers: req.headers, user: req.user });
    next();
});

// set up cookie parsing and body parsing for all paths
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));

// set up passport authentication
var publicPaths = ['/app/common/', '/app/css/', '/app/images/', '/app/js', '/app/lib/', '/app/public/', '/app/util', '/user/login', '/user/signup/' ];
var passport = require('./modules/authentication.js')(app, publicPaths, '/user/login', '/app/public/Login.html', redirectToDefaultPage);

// tell express that the static files live in the "public" directory 
// and respond to requests to /public URLs
app.use('/app', express.static('app'));
app.use('/app/:privacy(public|protected)/common', express.static('app/common'));
app.use('/app/:privacy(public|protected)/controllers', express.static('app/controllers'));
app.use('/app/:privacy(public|protected)/css', express.static('app/css'));
app.use('/app/:privacy(public|protected)/images', express.static('app/images'));
app.use('/app/:privacy(public|protected)/js', express.static('app/js'));
app.use('/app/:privacy(public|protected)/lib', express.static('app/lib'));
app.use('/app/:privacy(public|protected)/util', express.static('app/util'));

// tell express that our API handlers will be served in response
// to requests to /api URLs
app.use('/api', bodyParser.json({ strict: true }));


// ============
// ROUTES

log.info('setting up routes');

// API routes
app.get('/api/:type/:joins?', dataServices.getData);
app.post('/api/:type?', dataServices.postData);
app.get('/api/:type/query/:query/:joins?', dataServices.getData);


// signup routes
app.get('/user/signup/Educator', signupServices.getSignupData);
app.post('/user/signup/Educator', signupServices.postSignupData);
app.post('/user/signup/Educator/Tenure', signupServices.postTenureData);
app.post('/user/logout')


// =============

// start listening for requests on port 1337 (by default)
app.listen(port);

log.info('setup done; listening on port ' + port);

// =============

function redirectToDefaultPage(req, res, next) {
    if (req.user.LinkedOrganizationID) {
        return res.redirect('/app/protected/ReviewEmployees.html');
    } else {
        return res.redirect('/app/protected/EducatorDashboard.html');
    }
}