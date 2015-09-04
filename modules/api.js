"use strict"

var http = require('http');
var log = require('../modules/logging')('api');
var uuid = require('uuid');
var Promise = require('bluebird');
var rest = require('restling');

var apiRootUrl = 'http://localhost:1337/api/';

module.exports.save = saveData;
module.exports.query = loadData;

function saveData(o, typeKey) {
    if (o.constructor !== Array) {
        if (!typeKey && !o._TypeKey) {
            throw new Error('No typeKey provided to API save()');
        } else if (!typeKey) {
            typeKey = o._TypeKey;
        }
    } else if (!typeKey) {
        for (var i = 0; i < o.length; i++) {
            if (!o[i]._TypeKey) {
                throw new Error('No TypeKey could be inferred for object in array at index ' + i.toString());
            }
        }
    }
    return new Promise(function (resolve, reject) {
        var retPromise = null;
        if (typeKey) {
            retPromise = rest.postJson(makeApiUrl(typeKey), o);
        } else {
            retPromise = rest.postJson(makeApiUrl(null), o);
        }
        return retPromise.then(function (result) {
            resolve(result.data);
        }, function (err) {
            reject(err);
        });
    });
}



function loadData(typeKey, joins, conditions) {
    var url = typeKey;
    if (joins) {
        url += '/' + joins;
    }
    if (conditions) {
        url += '?';
        var first = true;
        for (var prop in conditions) {
            if (!first) {
                url += '&';
            } else {
                first = false;
            }
            url += prop + '=' + encodeURIComponent(conditions[prop]);
        }
    }
    url = makeApiUrl(url);
    return new Promise(function (resolve, reject) {
        rest.get(url).then(function (result) {
            resolve(result.data);
        }, function (err) {
            reject(err);
        });
    });
}

function makeApiUrl(url) {
    return apiRootUrl + (url ? url : '');
}