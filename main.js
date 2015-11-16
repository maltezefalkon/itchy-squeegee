/*
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
var busboy = require('connect-busboy')();

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
    /^\/app\/view\/Contact$/i, 
    /^\/app\/view\/About$/i, 
    /^\/app\/view\/UserSignup\/?/i,
    /^\/app\/user\/Signup\/?/i,
    /^\/app\/user\/Confirm\/?/i,
    /^\/favicon.ico$/i,
    /^\/app\/view\/FatalError\/?$/i,
    /^\/app\/view\/TestEmail\/?$/i,
    /^\/app\/view\/Hold\/?$/i,
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
app.use('/app/view/', bodyParser.urlencoded({ extended: false }));
app.use('/app/user/', bodyParser.urlencoded({ extended: false }));

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
app.get('/api/command/:commandName', dataServices.executeCommand);
app.post('/api/command/:commandName', dataServices.executeCommand);

// business logic
app.use('/app/biz', express.static('biz'));

// user management routes
app.post('/app/user/login', sessionManagement.createLoginHandler(loginPath));
app.get('/app/user/logout', sessionManagement.createLogoutHandler(loginPath));
app.get('/app/user/Confirm/:userID;:confirmationID', signupServices.confirmUserAccount);

// form routes
app.post('/app/view/FillForm/:documentInstanceID', formServices.postFormData);
app.get('/app/form/CreateForm/:documentDefinitionID;:applicableTenureID?;:referenceTenureID?', formServices.createFormData);
app.get('/app/form/Download/:documentInstanceID', formServices.downloadDocument);
app.use('/app/form/Upload', busboy);
app.post('/app/form/Upload/:documentDefinitionID;:applicableTenureID?;:referenceTenureID?', formServices.uploadFormFile)

// signup routes
app.post('/app/view/UserSignup/:invitationID?', signupServices.postUserSignupData);
app.post('/app/view/OrganizationSignup/:invitationID', signupServices.postOrganizationSignupData);
app.post('/app/view/EducatorSignup/:invitationID?', signupServices.postEducatorSignupData);
app.post('/app/view/EducatorTenure/:invitationID?', signupServices.postEducatorTenureData);

// test
app.post('/app/view/TestEmail', signupServices.testSendEmail);

// =============

// start listening for requests on port 1337 (by default)
app.listen(port);

log.info('setup done; listening on port ' + port);

// =============
