﻿"use strict"

var log = require('../modules/logging')('api');
var uuid = require('uuid');
var Promise = require('bluebird');
var meta = require('./metadata.js')();
var perf = require('./performance-timing.js')();
var myUrl = require('./myurl.js');
var SubmissionStatus = require('../biz/status.js').SubmissionStatus;

module.exports.save = saveData;
module.exports.query = queryData;
module.exports.querySingle = querySingle;
module.exports.executeCommand = executeCommand;

function saveData(o, typeKeyOrDeepSave, deepSave) {
    var typeKey = typeKeyOrDeepSave;
    if (typeof typeKeyOrDeepSave === 'boolean') {
        deepSave = Boolean(typeKeyOrDeepSave);
        typeKey = null;
    }
    if (deepSave === undefined) {
        deepSave = true;
    }
    if (o.constructor !== Array) {
        if (!typeKey && !o._TypeKey && !o.Model) {
            throw new Error('No typeKey provided to API save()');
        } else if (!typeKey) {
            typeKey = o._TypeKey || o.Model.name;
        }
    } else if (!typeKey) {
        for (var i = 0; i < o.length; i++) {
            if (!o[i]._TypeKey) {
                throw new Error('No TypeKey could be inferred for object in array at index ' + i.toString());
            }
        }
    }
    return meta.Sequelize.transaction(function (txn) {
        var promise = null;
        if (o instanceof Array) {
            log.debug({ array: o, typeKey: typeKey }, 'Saving an array of ' + o.length.toString() + ' ' + (typeKey || 'objects'));
            // using foreach because it provides clean closure over each value
            o.forEach(function (obj, i) {
                if (null == promise) {
                    promise = saveObject(typeKey, obj, txn, deepSave);
                } else {
                    promise = promise.then(function () {
                        return saveObject(typeKey, obj, txn, deepSave);
                    });
                }
            });
        } else {
            log.debug({ obj: o, typeKey: typeKey }, 'Saving a single ' + (typeKey || o._TypeKey));
            promise = saveObject(typeKey, o, txn, deepSave);
        }
        return promise;
    });
}

function queryData(typeKey, joins, queryName, parameters) {
    if (!typeKey) {
        throw new Error('No typeKey specified');
    }
    if (joins && joins.constructor !== Array) {
        throw new Error('Joins must be an Array');
    }
    perf.start('queryData');
    var includes = buildIncludes(meta, typeKey, joins || []);
    var condition = getQueryCondition(typeKey, queryName, parameters);
    if (meta.db[typeKey]) {
        return meta.db[typeKey].findAll({ where: condition, include: includes })
            .then(function (data) {
            perf.stop('queryData');
            return data;
        });
    } else {
        throw 'Undefined type key: ' + typeKey;
    }
}

function querySingle(typeKey, joins, queryName, parameters) {
    return queryData(typeKey, joins, queryName, parameters).then(function (data) {
        if (data && data.length == 1) {
            return data[0];
        } else {
            return null;
        }
    });
}

function buildIncludes(meta, contextTypeKey, paths) {
    var ret = [];
    var map = {};
    var relationship = null;
    for (var i = 0; i < paths.length; i++) {
        var currentTypeKey = contextTypeKey;
        var parsed = paths[i].split('.');
        var head = parsed.shift();
        var thisPath = head;
        var currentInclude = null;
        if (!map[thisPath]) {
            var newInclude = { as: head };
            map[thisPath] = newInclude;
            currentInclude = newInclude;
            ret.push(currentInclude);
        } else {
            currentInclude = map[thisPath];
        }
        while (head) {
            relationship = meta.Metadata[currentTypeKey].Relationships[head];
            if (!relationship) {
                throw new Error('Relationship "' + head + '" not defined for type "' + currentTypeKey + '"');
            }
            currentTypeKey = relationship.RelatedTypeKey;
            currentInclude['model'] = meta.db[currentTypeKey];
            head = parsed.shift();
            if (head) {
                thisPath += '.' + head;
                if (!map[thisPath]) {
                    if (!currentInclude.include) {
                        currentInclude.include = [];
                    }
                    var newInclude = { as: head };
                    currentInclude.include.push(newInclude);
                    map[thisPath] = newInclude;
                    currentInclude = newInclude;
                } else {
                    currentInclude = map[thisPath];
                }
            }
        }
    }
    return ret;
}

function saveObject(typeKeyParamValue, o, txn, deepSave) {
    
    // figure out the correct type key
    var typeKey = typeKeyParamValue || o._TypeKey || o.Model.name;
    if (!typeKey) {
        throw new Error('Could not infer type key for object');
    }
    
    // supply key if necessary
    var operationData = supplyKeyIfNecessary(typeKey, o);
    
    // log what we're doing
    var msg = { operation: operationData, typeKey: typeKey, obj: o };
    log.info(msg, operationData.operation + 'ing ' + typeKey);
    
    // create the promise for the insert or update
    var promise = null;
    var options = { transaction: txn };
    if (operationData.operation === 'save') {
        promise = o.save(options);
    } else if (operationData.operation === 'update') {
        options.where = findPrimaryKeyValues(typeKey, o);
        promise = meta.db[typeKey].update(createCloneForUpdate(typeKey, o), options);
    } else if (operationData.operation === 'insert') {
        promise = meta.db[typeKey].create(o, options);
    } else if (operationData.operation === 'upsert') {
        promise = meta.db[typeKey].upsert(o, options);
    } else {
        throw new Error('Unrecognized database opertaion: ' + operationData.operation);
    }
    var ret = promise.then(function (result) {
        log.info(typeKey + ' ' + operationData.operation + ': success');
    });
    
    if (deepSave) {
        // save subobjects
        for (var r in meta.Metadata[typeKey].Relationships) {
            if (o[r]) {
                ret = chainSubobjectSave(o[r], r, typeKey, txn, ret, o)
            }
        }
    }
    
    // return the promise
    return ret;
}

function chainSubobjectSave(related, r, typeKey, txn, outerPromise) {
    return outerPromise.then(function () {
        log.debug('inside subobject then for ' + r);
        return saveSubobjectsForRelationship(related, r, typeKey, txn, outerPromise);
    });
}

function saveSubobjectsForRelationship(related, r, typeKey, txn, outerPromise) {
    var relationship = meta.Metadata[typeKey].Relationships[r];
    var ret = outerPromise;
    if (related instanceof Array) {
        log.debug({ relationshipName: r, relationship: relationship }, 'found an array of subobjects for relationship');
        related.forEach(function (subobject) {
            ret = ret.then(function () {
                log.debug('calling saveObject for subobject array for relationship ' + r);
                return saveObject(relationship.RelatedTypeKey, subobject, txn);
            });
        });
    } else {
        log.debug({ relationshipName: r, relationship: relationship }, 'found a single subobject for relationship');
        ret = ret.then(function () {
            log.debug('calling saveObject for single subobject for relationship ' + r);
            return saveObject(relationship.RelatedTypeKey, related, txn);
        });
    }
    return ret;
}

function supplyKeyIfNecessary(typeKey, o) {
    var ret = {
        operation: 'upsert',
        newID: undefined
    };
    if (o.Model && !o.isNewRecord) {
        ret.operation = 'save';
    } else if (meta.Metadata[typeKey].PrimaryKeyFields.length == 1) {
        var f = meta.Metadata[typeKey].PrimaryKeyFields[0];
        if (!o[f]) {
            ret.newID = uuid();
            ret.operation = 'insert';
            log.debug({ newid: ret.newID, field: f, typeKey: typeKey }, 'Supplied key value "' + ret + '" for field "' + f + '" for insert of type "' + typeKey + '"');
            o[f] = ret.newID;
            
            // propagate key to subobjects
            for (var r in meta.Metadata[typeKey].Relationships) {
                var relationship = meta.Metadata[typeKey].Relationships[r];
                if (o[r]) {
                    var fkeyProperty = null;
                    for (var fdef in meta.Metadata[relationship.RelatedTypeKey].FieldDefinitions) {
                        if (meta.Metadata[relationship.RelatedTypeKey].FieldDefinitions[fdef].field == relationship.ForeignKey) {
                            fkeyProperty = fdef;
                            break;
                        }
                    }
                    if (!fkeyProperty) {
                        throw new Error('Failed to find a corresponding property on type ' + r.RelatedTypeKey + ' for field ' + r.ForeignKey);
                    }
                    if (o[r] instanceof Array) {
                        o[r].forEach(function (subobject) {
                            subobject[fkeyProperty] = ret.newID;
                        });
                    } else {
                        o[r][fkeyProperty] = ret.newID;
                    }
                }
            }
        } else {
            ret.operation = 'update';
        }
    }
    return ret;
}

function findPrimaryKeyValues(typeKey, o) {
    var ret = {};
    var f = null;
    for (var i = 0; i < meta.Metadata[typeKey].PrimaryKeyFields.length; i++) {
        f = meta.Metadata[typeKey].PrimaryKeyFields[i];
        ret[f] = o[f];
    }
    return ret;
}

function getQueryCondition(typeKey, queryName, parameters) {
    if (!queryName) {
        return parameters;
    } else {
        var prototypeQueryConditions = meta.Metadata[typeKey].Queries[queryName];
        var queryObject = {};
        if (!prototypeQueryConditions) {
            throw new Error('No query named "' + queryName + '" found for type key "' + typeKey + '"');
        } else {
            var ret = replaceParameterExpressions(prototypeQueryConditions, parameters);
            return ret;
        }
    }
}

function replaceParameterExpressions(proto, parameters) {
    var ret = undefined;
    if (typeof proto === 'string') {
        ret = proto.replace(/\[(\w+)\]/, function (a, b) {
            return parameters[b];
        });
    } else if (proto instanceof Array) {
        ret = [];
        for (var i = 0; i < proto.length; i++) {
            ret.push(replaceParameterExpressions(proto[i], parameters));
        }
    } else if (isObject(proto)) {
        ret = {};
        for (var f in proto) {
            ret[f] = replaceParameterExpressions(proto[f], parameters);
        }
    } else {
        ret = proto;
    }
    return ret;
}

function isObject(obj) {
    return obj === Object(obj);
}

function createCloneForUpdate(typeKey, o) {
    var ret = {};
    for (var f in o) {
        if (meta.Metadata[typeKey].PrimaryKeyFields.indexOf(f) == -1) {
            ret[f] = o[f];
        }
    }
    return ret;
}

function executeCommand(command, commandArguments) {
    var ret = null;
    switch (command) {
        case 'GenerateInvitation':
            ret = GenerateInvitation(commandArguments);
            break;
        case 'SubmitDocument':
            ret = SubmitDocument(commandArguments);
            break;
        case 'ReviewSubmission':
            ret = ReviewSubmission(commandArguments);
            break;
    }
    return ret;
}

function GenerateInvitation(commandArguments) {
    var invitationType = commandArguments.invitationType;
    var date = commandArguments.date || new Date();
    var emailAddress = commandArguments.emailAddress || null;
    var expirationDate = commandArguments.expirationDate;
    var organizationID = commandArguments.user.LinkedOrganizationID;
    if (!expirationDate) {
        expirationDate = date;
        expirationDate.setDate(expirationDate.getDate() + 14);
    }
    var o = {
        _TypeKey: 'Invitation',
        IssueDateTime: date,
        ExpirationDate: expirationDate,
        EmailAddress: emailAddress
    };
    if (invitationType === 'Employee') {
        o.EmployeeOrganizationID = organizationID;
    } else if (invitationType === 'Applicant') {
        o.ApplicantOrganizationID = organizationID;
    } else {
        throw new Error('Unsupported invitation type: ' + invitationType);
    }
    return saveData(o, false).then(function () {
        return { Url: myUrl.createUrl(myUrl.createUrlType.UserSignup, [o.InvitationID]) };
    });
}

function SubmitDocument(commandArguments) {
    var documentInstanceID = commandArguments.documentInstanceID;
    var tenureID = commandArguments.tenureID;
    var organizationID = commandArguments.organizationID;
    if (!tenureID || !documentInstanceID) {
        throw new Error('Invalid parameters specified for SubmitDocument command');
    }
    return querySingle('Tenure', [], null, { TenureID: tenureID }).then(function (tenure) {
        if (!tenure) {
            throw new Error('Invalid TenureID ' + tenureID);
        } else if (tenure.EducatorID != commandArguments.user.LinkedEducatorID) {
            throw new Error('Invalid tenure specified');
        } else {
            return tenure;
        }
    }).then(function (tenure) {
        var submission = {
            _TypeKey: 'DocumentSubmission',
            DocumentInstanceID: documentInstanceID,
            ApplicableTenureID: tenureID,
            StatusID: SubmissionStatus.AwaitingApproval.StatusID,
            StatusDescription: SubmissionStatus.AwaitingApproval.Description,
            EducatorID: commandArguments.user.LinkedEducatorID,
            OrganizationID: tenure.OrganizationID,
            SubmissionDate: new Date()
        };
        return saveData(submission).then(function () {
            return {
                tenure: tenure,
                submission: submission
            };
        });
    }).then(function (o) {
        var event = new meta.bo.SystemEvent();
        event.ObjectTypeKey = 'DocumentSubmission';
        event.ObjectID = o.submission.DocumentSubmissionID;
        event.Description = 'Document submitted to organization';
        event.Data = {
            DocumentInstanceID: documentInstanceID,
            DocumentSubmissionID: o.submission.DocumentSubmissionID,
            EducatorID: o.submission.EducatorID,
            OrganizationID: o.submission.OrganizationID
        };
        event.EventDateTime = new Date();
        event.ProcessDateTime = null;
        event.ProcessStatus = null;
        return saveData(event);
    });
}

function ReviewSubmission(commandArguments) {
    var documentSubmissionID = commandArguments.documentSubmissionID;
    var statusID = commandArguments.StatusID;
    var statusDescription = SubmissionStatus.LookupByID(statusID).Description;
    if (!documentSubmissionID || !statusID) {
        throw new Error('Invalid parameters passed to ReviewSubmission');
    }
    return querySingle('DocumentSubmission', ['DocumentInstance.Definition'], null, { DocumentSubmissionID: documentSubmissionID })
    .then(function (submission) {
        if (submission.OrganizationID != commandArguments.user.LinkedOrganizationID) {
            throw new Error('Not authorized to approve submission');
        }
        submission.StatusID = statusID;
        submission.StatusDescription = statusDescription;
        if (statusID == SubmissionStatus.Approved.StatusID) {
            submission.ApprovalDate = new Date();
            submission.RenewalDate = require('./forms.js').CalculateRenewalDate(submission.DocumentInstance.Definition, submission.DocumentInstance.DocumentDate);
        }
        return saveData(submission).then(function () { return submission; });
    }).then(function (submission) {
        var event = new meta.bo.SystemEvent();
        event.ObjectTypeKey = 'DocumentSubmission';
        event.ObjectID = submission.DocumentSubmissionID;
        event.Description = 'Submission approved by organization';
        event.Data = {
            DocumentInstanceID: submission.DocumentInstanceID,
            DocumentSubmissionID: submission.DocumentSubmissionID,
            EducatorID: submission.EducatorID,
            OrganizationID: submission.OrganizationID
        };
        event.EventDateTime = new Date();
        event.ProcessDateTime = null;
        event.ProcessStatus = null;
        return saveData(event);
    });
}

