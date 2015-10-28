var ViewData = require('../../app/views/Base.data.js');

module.exports = function (req) {
    return new ViewData(req, 'About', 'About');
};

