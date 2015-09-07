"use strict"

// requires
var log = require('../modules/logging')('formserver');
var api = require('../modules/api');
var meta = require('../modules/metadata')();

// expose public methods
module.exports.postFormData = postFormData;

function postFormData(req, res, next) {
    var data = req.body;
    if (req.method != 'POST') {
        throw new Error('Invalid verb routed to postFormData');
    }

    var 
}

