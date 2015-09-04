"use strict"

var contextFunction

module.exports = renderView;

function renderView(req, res) {
    var viewName = req.params.view;
    var contextFunction = require('../views/context/' + viewName);
    var context = contextFunction();
    if (context.then) {
        context.then(function (data) {
            res.render(viewName, data);
        });
    } else {
        res.render(viewName, context);
    }
}