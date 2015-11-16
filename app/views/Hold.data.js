var ViewData = require('../../app/views/Base.data.js');

module.exports = function (req) {
    var ret = new ViewData(req, 'Awaiting Confirmation');
    ret.message = "A confirmation email has been sent.  Please click the link in the email to continue with the registration process.";
    return ret;
};

