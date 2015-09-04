/*
 * Data Server script
 * 
 */

"use strict"

// requires
var url = require('url');
var queryString = require('querystring');
var meta = require('../modules/metadata')();
var log = require('../modules/logging')('dataserver');
var uuid = require('uuid');

// expose the getData method
module.exports.getData = getData;

// expose the postData method
module.exports.postData = postData;

// --------------------------------------------------------------------------------------------------------------------

// public functions
    
function getData(req, res) {
    
    // express routing parameters for root type and joins
    var typeKey = req.params.type;
    var joins = req.params.joins;
    
    // query string (filter)
    var thisUrl = url.parse(req.url, true);
    var condition = thisUrl.query;
    
    // TODO: check permissions on data!

    if (req.method == "GET") {
        var properties = [];
        if (joins) {
            properties = joins.split(',');
        }
        var includes = buildIncludes(meta, typeKey, properties);
        if (meta.db[typeKey]) {
            meta.db[typeKey].findAll({ where: condition, include: includes }).then(
                function (results) {
                    res.send(results);
                    res.end();
                });
        } else {
            throw "Undefined type key: " + typeKey;
        }
    } else {
        throw "Invalid verb routed to getData method";
    }
}

function postData(req, res) {
    
    // express route parameter for type name
    var typeKeyParamValue = req.params.type;
    
    // TODO: check permissions on data!

    if (req.method == "POST") {
        meta.Sequelize.transaction(function (txn) {
            var promise = null;
            if (req.body instanceof Array) {
                log.debug({ array: req.body, typeKeyUrlParameter: typeKeyParamValue }, 'Saving an array of ' + req.body.length.toString() + ' ' + (typeKeyParamValue || 'objects'));
                // using foreach because it provides clean closure over each value
                req.body.forEach(function (o, i) {
                    if (null == promise) {
                        promise = saveObject(typeKeyParamValue, o, txn);
                    } else {
                        promise = promise.then(function () {
                            return saveObject(typeKeyParamValue, o, txn);
                        });
                    }
                });
            } else {
                log.debug({ object: req.body, typeKeyUrlParameter: typeKeyParamValue }, 'Saving a single ' + (typeKeyParamValue || req.body._TypeKey));
                promise = saveObject(typeKeyParamValue, req.body, txn);
            }
            log.debug({ promise: promise }, 'ready to return final promise');
            return promise;
        })
        .then(function () { completeSuccessfully(req, res); }, function (err) { completeError(err, req, res); });
    } else {
        throw "Invalid verb routed to postData method";
    }
}

// --------------------------------------------------------------------------------------------------------------------

// private functions

function completeSuccessfully(req, res) {
    log.debug('completeSuccessfully invoked');
    res.send(req.body);
    res.end();
}

function completeError(err, req, res) {
    log.debug('completeError invoked');
    res.status = 500;
    res.send(err);
    res.end();
}

function buildIncludes(meta, contextTypeKey, paths) {
    var ret = [];
    var map = {};
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
            currentTypeKey = meta.Metadata[currentTypeKey].Relationships[head].RelatedTypeKey;
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

function saveObject(typeKeyParamValue, o, txn) {
    var typeKey = typeKeyParamValue || o._TypeKey;
    if (!typeKey) {
        throw new Error('Could not infer type key for object');
    }
    var insert = supplyKeyIfNecessary(typeKey, o);
    var msg = { operation: insert ? 'insert' : 'update', typeKey: typeKey, obj: o };
    if (insert) {
        log.info(msg, 'Inserting ' + typeKey);
    } else {
        log.info(msg, 'Updating ' + typeKey);
    }
    // call the upsert
    var ret = meta.db[typeKey].upsert(o, { transaction: txn }).then(function (result) {
        log.info('Saved ' + typeKey + ' successfully');
    });
    
    // save subobjects
    for (var r in meta.Metadata[typeKey].Relationships) {
        log.debug('Examining relationship ' + r + ' on type ' + typeKey);
        if (o[r]) {
            ret = chainSubobjectSave(o[r], r, typeKey, txn, ret, o)
        }
    }
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
    var ret = undefined;
    
    if (meta.Metadata[typeKey].PrimaryKeyFields.length == 1) {
        var f = meta.Metadata[typeKey].PrimaryKeyFields[0];
        ret = uuid();
        log.debug({ newid: ret, field: f, typeKey: typeKey }, 'Supplied key value "' + ret + '" for field "' + f + '" for insert of type "' + typeKey + '"');
        o[f] = ret;
        
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
                        subobject[fkeyProperty] = ret;
                    });
                } else {
                    o[r][fkeyProperty] = ret;
                }
            }
        }
    }
    return ret;
}

