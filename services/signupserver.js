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
var forms = require('../modules/forms');
var sessionManagement = require('../modules/session-management');
var myUrl = require('../modules/myurl');
var Promise = require('bluebird');

// expose public methods
module.exports.getUserSignupData = getUserSignupData;

module.exports.postUserSignupData = postUserSignupData;
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
    var educatorID = req.user.LinkedEducatorID;
    var newOrganization = undefined;

    var tenure = {
        _TypeKey: 'Tenure',
        EducatorID: educatorID,
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
    
    var nextUrl = req.path;
    var promise = api.save(toBeSaved);
    
    if (data.DoneEnteringHistory === 'true') {
        promise = promise.then(function () {
            return createDocumentStubs(educatorID, function (tenure) { return !tenure.StartDate; });
        });
        
        nextUrl = myUrl.createUrl(myUrl.createUrlType.EducatorDashboard);
    }

    promise.then(function (returned) {
        res.redirect(nextUrl);
        res.end();
    });
}

function postEducatorSignupData(req, res, next) {
    
    if (req.method != "POST") {
        throw new Error("Invalid verb routed to postOrganizationSignupData");
    }

    var data = req.body;

    var ret = {
        errorMessage: null,
        invitation: null,
        tenure: null,
        user: null,
        educator: null,
        skipHistory: null,
        isApplicant: null
    };
    
    var promise = Promise.resolve(ret);
    
    var today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (req.params.invitationID) {
        promise = promise.then(function () {
            return api.querySingle('Invitation', [], null, { InvitationID: req.params.invitationID });
        }).then(function (invitation) {
            if (invitation) {
                if (invitation.ExpirationDate < today) {
                    log.warn('Expired invitation (UUID: ' + req.params.invitationID + ')');
                    ret.errorMessage = 'Expired invitation';
                } else {
                    ret.invitation = invitation;
                    ret.skipHistory = (invitation.EducatorID || invitation.EmployeeOrganizationID);
                    ret.isApplicant = (invitation.ApplicantOrganizationID != null);
                }
            } else {
                ret.errorMessage = 'Invalid Invitation UUID';
            }
            return ret;
        }).then(function (ret) {
            if (ret.invitation.EducatorID) {
                return api.querySingle('Educator', [], null, { EducatorID: ret.invitation.EducatorID })
                .then(function (educator) {
                    if (!educator) {
                        ret.errorMessage = 'Invalid Educator ID';
                    } else {
                        ret.educator = educator;
                        ret.skipHistory = true;
                    }
                    return ret;
                });
            }
            return ret;
        })
    } else {
        ret.skipHistory = true;
    }
    
    promise = promise.then(function (ret) {
        if (!ret.educator) {
            ret.educator = {
                _TypeKey: 'Educator'
            };
        }
        ret.educator.Title = data.Title;
        ret.educator.FirstName = data.FirstName;
        ret.educator.MiddleName = data.MiddleName;
        ret.educator.LastName = data.LastName;
        ret.educator.Suffix = data.Suffix;
        ret.educator.FormerName = data.FormerName;
        ret.educator.DateOfBirth = data.DateOfBirth;
        ret.educator.Last4 = data.Last4;
        ret.educator.PPID = data.PPID;
        ret.educator.EmailAddress = req.user.EmailAddress;
        ret.educator.TelephoneNumber = data.TelephoneNumber;
        ret.educator.Address1 = data.Address1;
        ret.educator.Address2 = data.Address2;
        ret.educator.City = data.City;
        ret.educator.State = data.State;
        ret.educator.ZipCode = data.ZipCode
        return api.save(ret.educator).then(function () {
            return ret;
        });
    }).then(function (ret) {
        if (ret.invitation) {
            var organizationID = ret.invitation.ApplicantOrganizationID || ret.invitation.EmployeeOrganizationID || ret.educator.SeedOrganizationID;
            var startDate = ret.invitation.ApplicantOrganizationID ? null : data.StartDate;
            var applicationDate = ret.invitation.ApplicantOrganizationID ? new Date() : null;
            ret.tenure = {
                _TypeKey: 'Tenure',
                EducatorID: ret.educator.EducatorID,
                OrganizationID: organizationID,
                StartDate: startDate,
                ApplicationDate: applicationDate,
                PositionsHeld: data.PositionsHeld,
                EndDate: null
            };
            return api.save(ret.tenure).then(function () {
                return ret;
            });
        } else {
            return ret;
        }
    }).then(function (ret) {
        req.user.LinkedEducatorID = ret.educator.EducatorID;
        return api.save(req.user).then(function () {
            return ret;
        });
    }).then(function (ret) {
        if (ret.skipHistory) {
            return createDocumentStubs(ret.educator.EducatorID, function (tenure) { return !tenure.EndDate; }).then(function () {
                return ret;
            });
        } else {
            return ret;
        }
    }).then(function (ret) {
        var nextUrl = ret.skipHistory? myUrl.createDefaultUrl(req.user) : myUrl.createUrl(myUrl.createUrlType.EducatorTenure);
        res.redirect(nextUrl);
    });

}

function postOrganizationSignupData(req, res, next) {
    
    if (req.method != "POST") {
        throw new Error("Invalid verb routed to postOrganizationSignupData");
    }
    
    if (!req.params.invitationID) {
        throw new Error('No invitationID specified with confirmation of organization signup data');
    }
    
    var promise = api.querySingle('Invitation', [], null, { InvitationID: req.params.invitationID });
    
    var ret = {
        errorMessage: null,
        user: null,
        organization: null
    };

    var today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    promise = promise.then(function (invitation) {
        if (invitation) {
            if (invitation.ExpirationDate < today) {
                log.warn('Expired invitation (UUID: ' + req.params.invitationID + ')');
                ret.errorMessage = 'Expired invitation';
            } else if (req.body.OrganizationID != invitation.RepresentedOrganizationID) {
                ret.errorMessage = 'Invalid request';
            } else {
                req.user.LinkedOrganizationID = invitation.RepresentedOrganizationID;
                ret.user = req.user;
            }
        } else {
            ret.errorMessage = 'Invalid Invitation UUID';
        }
        return ret;
    }).then(function (ret) {
        ret.organization = {
            _TypeKey: 'Organization',
            OrganizationID: req.body.OrganizationID || null,
            Name: req.body.OrganizationName,
            Address1: req.body.OrganizationAddress1,
            Address2: req.body.OrganizationAddress2,
            City: req.body.OrganizationCity,
            State: req.body.OrganizationState,
            ZipCode: req.body.OrganizationZipCode,
            EmailAddress: req.body.OrganizationEmail,
            TelephoneNumber: req.body.OrganizationTelephoneNumber,
            FaxNumber: req.body.OrganizationFaxNumber,
            RepresentativeFirstName: req.body.RepresentativeFirstName,
            RepresentativeLastName: req.body.RepresentativeLastName,
            RepresentativeJobTitle: req.body.RepresentativeJobTitle
        };
        return ret;
    }).then(function (ret) {
        return api.save(ret.organization).then(function () {
            return ret;
        });
    }).then(function (ret) {
        return api.save(ret.user).then(function () {
            return ret;
        });
    }).then(function (ret) {
        res.redirect(myUrl.createDefaultUrl(req.user));
    });
    
}

function createDocumentStubs(educatorID, tenurePredicate) {
    log.debug('Creating document stubs');
    var ret = api.query('Educator', ['Tenures.Organization'], null, { EducatorID: educatorID });
    ret = ret.then(function (educatorList) {
        var documentTenure = null;
        var educator = educatorList[0];
        for (var i = 0; i < educator.Tenures.length; i++) {
            if (tenurePredicate(educator.Tenures[i])) {
                documentTenure = educator.Tenures[i];
                break;
            }
        }
        if (null == documentTenure) {
            throw new Error('Failed to find documentTenure');
        }
        var docs = null;
        docs = forms.CreateDocumentStubs(documentTenure, educator.Tenures, educator);
        log.debug({ docs: docs}, 'Created ' + docs.length.toString() + ' document stubs');
        var innerPromise = null;
        docs.forEach(function (doc) {
            if (innerPromise == null) {
                innerPromise = api.save(doc);
            } else {
                innerPromise = innerPromise.then(function () {
                    return api.save(doc);
                });
            }
        });
        return innerPromise;
    });
    return ret;
}

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
        Hash: hash
    };
    
    var promise = Promise.resolve();
    
    promise = promise.then(function () {
        return api.querySingle('User', [], null, { UserName: data.EmailAddress });
    }).then(function (returned) {
        if (returned) {
            return {
                createSession: false,
                invitation: null,
                nextUrl: req.path + '?Message=' + encodeURIComponent('The user name ' + data.EmailAddress + ' is already registered.')
            };
        } else {
            return {
                createSession: null,
                invitation: null,
                nextUrl: null,
            }
        }
    });
    
    if (req.params.invitationID) {
        promise = promise.then(function (data) {
            if (!data.nextUrl) {
                return api.querySingle('Invitation', [], null, { InvitationID: req.params.invitationID })
                    .then(function (invitation) {
                        data.invitation = invitation;
                        return data;
                    });
            } else {
                return data;
            }
        })
        promise = promise.then(function (data) {
            var today = new Date();
            today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            if (!data.nextUrl) {
                if (data.invitation) {
                    if (data.invitation.ExpirationDate < today) {
                        log.warn('Expired invitation (UUID: ' + req.params.invitationID + ')');
                        data.nextUrl = myUrl.createUrl(myUrl.createUrlType.Login);
                        data.invitation = null;
                        data.createSession = false;
                    } else if (data.invitation.ApplicantOrganizationID || data.invitation.EducatorID || data.invitation.EmployeeOrganizationID) {
                        data.createSession = true;
                        data.nextUrl = myUrl.createUrl(myUrl.createUrlType.EducatorSignup, [data.invitation.InvitationID], null, true);
                    } else if (data.invitation.RepresentedOrganizationID) {
                        data.createSession = true;
                        data.nextUrl = myUrl.createUrl(myUrl.createUrlType.OrganizationSignup, [data.invitation.InvitationID], null, true);
                    } else {
                        data.createSession = false;
                        data.nextUrl = myUrl.createUrl(myUrl.createUrlType.Error, [], { message: 'Invalid invitation' }, true);
                    }
                } else {
                    log.warn('Invalid invitation UUID: ' + req.params.invitationID);
                    data.nextUrl = myUrl.createUrl(myUrl.createUrlType.Login);
                    data.createSession = false;
                }
            }
            return data;
        });
    }
    
    promise = promise.then(function (data) {
        if (data.createSession) {
            if (!data.invitation) {
                data.nextUrl = myUrl.createUrl(myUrl.createUrlType.EducatorSignup, [], null, true);
            } else if (data.invitation) {
                user.InvitationID = data.invitation.InvitationID;
            }
            return api.save(user).then(function () {
                return data;
            });
        } else {
            return data;
        }
    });
    
    promise = promise.then(function (data) {
        if (data.invitation && data.createSession) {
            data.invitation.FulfillmentUserID = user.UserID;
            data.invitation.FulfillmentDateTime = new Date();
            return api.save(data.invitation).then(function () { return data; });
        } else {
            return data;
        }
    });

    return promise
        .then(function (data) {
            if (data.createSession !== false) {
                return sessionManagement.createSession(user, req, res, next)
                    .then(function () { return data; });
            } else {
                return data;
            }
        }).then(function (data) {
            res.redirect(data.nextUrl);
        });
}

/*
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