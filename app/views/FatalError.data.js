var ViewData = require('../../app/views/Base.data.js');

module.exports = function (req) {
    var ret = new ViewData(req, 'Error', 'Error');
    ret.message = req.query.message;
    return ret;
};

