/*
 * Signup Server script
 * 
 */

"use strict"

// requires
var log = require('../modules/logging')('signupserver');
var api = require('../modules/api');
var bcrypt = require('bcryptjs');
var meta = require('../modules/metadata')();
var uuid = require('uuid');
var url = require('url');
var path = require('path');

// expose public methods
module.exports.getUserSignupData = getUserSignupData;

module.exports.postEducatorSignupData = postEducatorSignupData;
module.exports.postEducatorTenureData = postEducatorTenureData;
module.exports.postOrganizationSignupData = postOrganizationSignupData;


// --------------------------------------------------------------------------------------------------------------------

// public functions

function getUserSignupData(req, res, next) {
    if (req.params.entity == 'Applicant' && !req.query.OrganizationID) {
        var msg = 'Malformed applicant URL';
        res.redirect('/app/public/FatalError.html?message=' + encodeURIComponent(msg));
    }
    res.sendFile(path.resolve('app/public/UserSignup.html'));
}

function postEducatorTenureData(req, res, next) {
    var data = req.body;

    if (req.method != "POST") {
        throw new Error("Invalid verb routed to postTenureData");
    }
    
    var newOrganization = undefined;

    var tenure = {
        _TypeKey: 'Tenure',
        EducatorID: data.EducatorID,
        StartDate: data.StartDate,
        EndDate: data.EndDate,
        PositionsHeld: data.PositionsHeld,
        Form168Eligible: true
    };
    
    if (!data.ExistingOrganizationID || data.ExistingOrganizationID.length != 36) {
        newOrganization = {
            _TypeKey: 'Organization',
            Name: data.OrganizationName,
            Address1: data.OrganizationAddress1,
            Address2: data.OrganizationAddress2,
            City: data.OrganizationCity,
            State: data.OrganizationState,
            ZipCode: data.OrganizationZipCode,
            EmailAddress: data.OrganizationEmail,
            TelephoneNumber: data.OrganizationTelephoneNumber,
            FaxNumber: data.OrganizationFaxNumber
        };
    } else {
        tenure.OrganizationID = data.ExistingOrganizationID;
    }

    var toBeSaved = null;

    if (newOrganization) {
        newOrganization.Tenures = [
            tenure
        ];
        toBeSaved = newOrganization;
    } else {
        toBeSaved = tenure;
    }
    
    log.debug({ tenure: tenure, newOrganization: newOrganization }, 'Creating tenure objects');
    
    api
        .save(toBeSaved)
        .then(function (returned) {
            var nextUrl = data.DoneEnteringHistory === 'true' ?
                    '/app/protected/EducatorDashboard.html?EducatorID=' + encodeURIComponent(data.EducatorID)
                    : '/app/protected/EducatorTenure.html?EducatorID=' + encodeURIComponent(data.EducatorID);
            res.redirect(nextUrl);
            res.end();
        });
}

function postEducatorSignupData(req, res, next) {
    
    var data = req.body;
    var isApplicant = (req.params.entity === 'Applicant' || req.query.IsApplicant === 'true');
    
    // TODO: check permissions on data!
    
    if (req.method != "POST") {
        throw new Error('Invalid verb routed to postEducatorSignupData');
    }
    
    var user = {
        _TypeKey: 'User'
    };
    
    var educator = undefined;
    var tenure = undefined;
    
    if (data.UserID) {
        
        educator = {
            _TypeKey: 'Educator',
            EducatorID: data.EducatorID || null,
            Title: data.Title,
            FirstName: data.FirstName,
            MiddleName: data.MiddleName,
            LastName: data.LastName,
            Suffix: data.Suffix,
            FormerName: data.FormerName,
            DateOfBirth: data.DateOfBirth,
            Last4: data.Last4,
            PPID: data.PPID,
            EmailAddress: data.EmailAddress,
            TelephoneNumber: data.TelephoneNumber,
            Address1: data.Address1,
            Address2: data.Address2,
            City: data.City,
            State: data.State,
            ZipCode: data.ZipCode
        };

        user.UserID = data.UserID;
        user.LinkedEducatorID = educator.EducatorID;
        educator.LinkedUser = user;

        if (data.OrganizationID) {
            tenure = {
                _TypeKey: 'Tenure',
                EducatorID: data.EducatorID || null,
                OrganizationID: data.OrganizationID,
                StartDate: data.StartDate || null,
                ApplicationDate: data.ApplicationDate || null,
                PositionsHeld: data.PositionsHeld
            };
            educator.Tenures = [tenure];
        }

    } else {

        var hash = bcrypt.hashSync(data.Password);
        user.EmailAddress = data.EmailAddress;
        user.UserName = data.EmailAddress;
        user.Hash = hash;

    }
    
    log.debug({ educator: educator, user: user, tenure: tenure }, 'Creating educator signup objects');
    
    var promise = educator ? api.save(educator) : api.save(user);
    
    promise
        .then(function () {
            var nextUrl = '/app/public/EducatorSignup.html?UserID=' + encodeURIComponent(user.UserID);
            if (data.QueryStringOrganizationID) {
                nextUrl += '&OrganizationID=' + encodeURIComponent(data.QueryStringOrganizationID);
            }
            if (data.QueryStringEducatorID) {
                nextUrl += '&EducatorID=' + encodeURIComponent(data.QueryStringEducatorID);
            }
            if (data.QueryStringEmailAddress) {
                nextUrl += '&EmailAddress=' + encodeURIComponent(data.QueryStringEmailAddress);
            }
            if (isApplicant) {
                nextUrl += '&IsApplicant=true';
            }
            if (educator) {
                nextUrl = (data.SkipHistory === 'true') ?
                    '/app/protected/EducatorDashboard.html'
                    : '/app/protected/EducatorTenure.html?EducatorID=' + encodeURIComponent(educator.EducatorID);
            }
            req.login(user, function (err) {
                if (err) {
                    return next(err);
                } else {
                    return res.redirect(nextUrl);
                }
            });
        });
}

function postOrganizationSignupData(req, res, next) {
    var data = req.body;
    
    if (req.method != "POST") {
        throw new Error("Invalid verb routed to postOrganizationSignupData");
    }

    var user = {
        _TypeKey: 'User'
    };
    
    var organization = undefined;
    
    if (data.UserID) {
        
        organization = {
            _TypeKey: 'Organization',
            OrganizationID: data.OrganizationID || null,
            Name: data.OrganizationName,
            Address1: data.OrganizationAddress1,
            Address2: data.OrganizationAddress2,
            City: data.OrganizationCity,
            State: data.OrganizationState,
            ZipCode: data.OrganizationZipCode,
            EmailAddress: data.OrganizationEmail,
            TelephoneNumber: data.OrganizationTelephoneNumber,
            FaxNumber: data.OrganizationFaxNumber
        };
        
        user.UserID = data.UserID;
        user.LinkedOrganizationID = organization.OrganizationID;
        organization.LinkedUser = user;

    } else {
        
        var hash = bcrypt.hashSync(data.Password);
        user.EmailAddress = data.EmailAddress;
        user.UserName = data.EmailAddress;
        user.Hash = hash;

    }
    
    log.debug({ organization: organization, user: user }, 'Creating organization signup objects');
    
    var promise = organization ? api.save(organization) : api.save(user);
            
    promise
        .then(function () {
        var nextUrl = '/app/public/OrganizationSignup.html?UserID=' + encodeURIComponent(user.UserID);
        if (data.QueryStringOrganizationID) {
            nextUrl += '&OrganizationID=' + encodeURIComponent(data.QueryStringOrganizationID);
        }
        if (organization) {
            nextUrl = '/app/protected/ReviewEmployees.html?OrganizationID=' + encodeURIComponent(organization.OrganizationID);
        }
        req.login(user, function (err) {
            if (err) {
                return next(err);
            } else {
                return res.redirect(nextUrl);
            }
        });
    });
}

/*
function postUserSignupData(req, res, next) {
    var data = req.body;
    
    if (req.method != "POST") {
        throw new Error("Invalid verb routed to postUserSignupData");
    }
    
    // gather user data
    
    var hash = bcrypt.hashSync(data.Password);
    var user = {
        _TypeKey: 'User',
        EmailAddress: data.EmailAddress,
        UserName: data.EmailAddress,
        Hash: hash,
        LinkedOrganizationID: data.LinkedOrganizationID || null,
        LinkedEducatorID: data.LinkedEducatorID || null
    };
    
    log.debug({ user: user }, 'Creating user signup objects');
    
    api.save(user).then(function (returned) {
        var nextUrl = user.LinkedOrganizationID ?
         '/app/public/OrganizationSignup.html?UserID=' + encodeURIComponent(user.UserID) + '&OrganizationID=' + encodeURIComponent(user.LinkedOrganizationID)
         : '/app/public/EducatorSignup.html?UserID=' + encodeURIComponent(user.UserID) + '&EducatorID=' + encodeURIComponent(user.LinkedEducatorID);
        req.login(user, function (err) {
            if (err) {
                return next(err);
            } else {
                return res.redirect(nextUrl);
            }
        });
    });
}

function buildQueryString() {
    var ret = '';
    for (var i = 0; i < arguments.length; i++) {
        for (var f in arguments[i]) {
            if (ret.length == 0) {
                ret = '?';
            } else {
                ret += '&';
            }
            ret += encodeURIComponent(f) + '=' + encodeURIComponent(arguments[i][f]);
        }
    }
    return ret;
}
*/