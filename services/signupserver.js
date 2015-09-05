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

// expose public methods
module.exports.getSignupData = getEducatorSignupData;
module.exports.postSignupData = postEducatorSignupData;
module.exports.postTenureData = postTenureData;


// --------------------------------------------------------------------------------------------------------------------

// public functions

function getEducatorSignupData(req, res) {
    var redirPath = '/app/public/EducatorSignup.html';
    if (req.params.OrganizationID) {
        redirPath += '?OrganizationID=' + req.params.OrganizationID;
    }
    res.redirect(redirPath);
}

function postTenureData(req, res) {
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

function postEducatorSignupData(req, res) {
    
    var data = req.body;
    
    // TODO: check permissions on data!
    
    if (req.method == "POST") {
        
        var educator = {
            _TypeKey: 'Educator',
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
        
        var hash = bcrypt.hashSync(data.Password);
        var user = {
            _TypeKey: 'User',
            EmailAddress: data.EmailAddress,
            UserName: data.EmailAddress,
            Hash: hash
        };
        
        educator.LinkedUser = user;
        
        log.debug({ educator: educator }, 'Creating signup objects');
        
        // we can't go through the public API because we're not authenticated yet
        
        // generate new IDs and assign
        educator.EducatorID = uuid();
        educator.LinkedUser.UserID = uuid();
        user.LinkedEducatorID = educator.EducatorID;
        
        var promise = meta.db['Educator'].create(educator);
        promise = promise.then(function () {
            return meta.db['User'].create(user);
        });
        promise.then(function () {
            var nextUrl = data.SkipHistory === 'true' ?
                '/app/protected/EducatorDashboard.html'
                : '/app/protected/EducatorTenure.html?EducatorID=' + encodeURIComponent(educator.EducatorID);
            req.login(user, function (err) {
                if (err) {
                    return next(err);
                } else {
                    return res.redirect(nextUrl);
                }
            });
        });
    } else {
        throw "Invalid verb routed to postSignupData method";
    }
}

