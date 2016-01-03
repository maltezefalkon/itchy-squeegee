var ViewData = require('../../app/views/Base.data.js');

module.exports = function (req) {
    var ret = new ViewData(req, req.query.title);
    ret.message = req.query.message;
    ret.button = req.query.button || 'Return to Home Page';
    ret.nextUrl = req.query.nextUrl || '/';
    return ret;
};

