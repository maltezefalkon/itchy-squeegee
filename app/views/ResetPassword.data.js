var ViewData = require('./Base.data.js');
var api = require('../../modules/api');
var myUrl = require('../../modules/myurl');

module.exports = function (req, userID) {
    var resetID = req.query.reset;
    var ret = new ViewData(req, 'Reset Password', 'ResetPassword');
    return api.querySingle('User', [], null, { UserID: userID }).then(function (user) {
        if (!user) {
            ret.fatalError = 'User not found';
        } else if (user.PasswordResetID != resetID) {
            ret.fatalError = 'Invalid password reset token';
        } else {
            ret.Username = user.UserName;
            ret.UserID = user.UserID;
            ret.ResetID = resetID;
        }
        return ret;
    });
}