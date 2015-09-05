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

// tell express that the static files live in the "public" directory 
// and respond to requests to /public URLs
app.use('/public', express.static('public'));

// tell express that our API handlers will be served in response
// to requests to /api URLs
app.use('/api', bodyParser.json({ strict: true }));


// set up passport authentication
var passport = require('./modules/authentication.js')(app, '/user/login', '/public/Login.html', '/public/ReviewEmployees.html');

// ============
// ROUTES

log.info('setting up routes');

// API routes
app.get('/api/:type/:joins?', dataServices.getData);
app.post('/api/:type?', dataServices.postData);
app.get('/api/:type/query/:query/:joins?', dataServices.getData);


// signup routes
app.use('/user/signup', bodyParser.urlencoded({ extended: false }));
app.get('/user/signup/Educator', signupServices.getSignupData);
app.post('/user/signup/Educator', signupServices.postSignupData);
app.post('/user/logout')


// =============

// start listening for requests on port 1337
var port = process.env.PORT || 1337;
app.listen(port);

log.info('setup done; listening on port ' + port);

