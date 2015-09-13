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

log.info('initializing');

// set up our web app
var app = express();
var viewEngine = require('./modules/view-engine.js')(app, '/views');

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
var publicPaths = ['/$', '/app/common/', '/app/css/', '/app/images/', '/app/js/', '/app/lib/', '/app/public/', '/app/public/*/', '/app/util/', '/user/login/', '/user/signup/*/', '/user/signup/*/*/' ];
var passport = require('./modules/authentication.js')(app, publicPaths, '/api/', '/user/login', '/app/public/Login.html', redirectToDefaultPage);

// "app" routes for our website 
app.use('/app/public', express.static('app/public'));
app.use('/app/protected', express.static('app/protected'));

// form routes
app.post('/app/form/FillForm', formServices.postFormData);
app.get('/app/form/Download/:DocumentInstanceID', formServices.getPDFForm);

app.use('/app/:privacy(public|protected)/common', express.static('app/common'));
app.use('/app/:privacy(public|protected)/controllers', express.static('app/controllers'));
app.use('/app/:privacy(public|protected)/css', express.static('app/css'));
app.use('/app/:privacy(public|protected)/images', express.static('app/images'));
app.use('/app/:privacy(public|protected)/js', express.static('app/js'));
app.use('/app/:privacy(public|protected)/lib', express.static('app/lib'));
app.use('/app/:privacy(public|protected)/util', express.static('app/util'));
app.use('/app/:privacy(public|protected)/biz', express.static('biz'));


// uber-hack to force a trailing slash so that the routes below work for css and script files
app.use('/user/signup/:entity(Educator|Organization)', function (req, res, next) {
    var stem = req.originalUrl;
    var queryStart = stem.indexOf('?');
    var query = '';
    var statusCode = req.method === 'POST' ? 307 : 301;
    if (queryStart > -1) {
        query = stem.substr(queryStart);
        stem = stem.substr(0, queryStart);
    }
    if (stem.substr(-1) !== '/' && (stem.substr(-12) == 'Organization' || stem.substr(-8) == 'Educator')) {
        res.redirect(statusCode, stem + '/' + query);
    } else {
        next();
    }
});
// signup re-routes for static assets served from the signup urls
app.use('/user/signup/:entity(Applicant|Educator|Organization)/common', express.static('app/common'));
app.use('/user/signup/:entity(Applicant|Educator|Organization)/controllers', express.static('app/controllers'));
app.use('/user/signup/:entity(Applicant|Educator|Organization)/css', express.static('app/css'));
app.use('/user/signup/:entity(Applicant|Educator|Organization)/images', express.static('app/images'));
app.use('/user/signup/:entity(Applicant|Educator|Organization)/js', express.static('app/js'));
app.use('/user/signup/:entity(Applicant|Educator|Organization)/lib', express.static('app/lib'));
app.use('/user/signup/:entity(Applicant|Educator|Organization)/util', express.static('app/util'));

// api URLs should use the JSON body parser
app.use('/api', bodyParser.json({ strict: true }));


// ============
// ROUTES

log.info('setting up routes');

app.get('/', function (req, res, next) {
    res.redirect('/app/public/index.html');
});

// API routes
app.get('/api/:type/:joins?', dataServices.getData);
app.post('/api/:type?', dataServices.postData);
app.get('/api/:type/query/:query/:joins?', dataServices.getData);


// signup routes
app.get('/user/signup/:entity(Applicant|Educator|Organization)', signupServices.getUserSignupData);

app.post('/user/signup/:entity(Applicant|Educator)', signupServices.postEducatorSignupData);
app.post('/user/signup/Educator/Tenure', signupServices.postEducatorTenureData);
app.post('/user/signup/:entity(Organization)', signupServices.postOrganizationSignupData);

app.get('/form')

// =============

// start listening for requests on port 1337 (by default)
app.listen(port);

log.info('setup done; listening on port ' + port);

// =============

function redirectToDefaultPage(req, res, next) {
    if (req.user.LinkedOrganizationID) {
        return res.redirect('/app/protected/ReviewEmployees.html?OrganizationID=' + encodeURIComponent(req.user.LinkedOrganizationID));
    } else if (req.user.LinkedEducatorID) {
        return res.redirect('/app/protected/EducatorDashboard.html?EducatorID=' + encodeURIComponent(req.user.LinkedEducatorID));
    } else {
        var message = 'This user account is not associated with an Educator or Organization. ' +
            'Please send an email to our technical support team to resolve this issue.';
        return res.redirect('/app/public/FatalError.html?message=' + encodeURIComponent(message));
    }
}