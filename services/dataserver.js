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
var api = require('../modules/api');

// expose the getData method
module.exports.getData = getData;

// expose the postData method
module.exports.postData = postData;

// --------------------------------------------------------------------------------------------------------------------

// public functions
    
function getData(req, res) {
    
    // express routing parameters for root type and joins
    var typeKey = req.params.type;
    var joinsSpecified = req.params.joins;
    var queryName = req.params.query;
    
    // query string (filter)
    var thisUrl = url.parse(req.url, true);
    
    // get joins
    var joins = [];
    if (joinsSpecified) {
        joins = joinsSpecified.split(',');
    }
    
    if (req.method == "GET") {
        api.query(typeKey, joins, queryName, thisUrl.query).then(
            function (results) {
                return res.json(results);
            }
        );
    } else {
        throw "Invalid verb routed to getData method";
    }
}

function postData(req, res) {
    
    // express route parameter for type name
    var typeKeyParamValue = req.params.type;
    
    // TODO: check permissions on data!

    if (req.method == "POST") {
        api.save(typeKeyParamValue, req.body).then(
            function (results) {
                return res.send(results);
            }
        );
    } else {
        throw "Invalid verb routed to postData method";
    }
}

