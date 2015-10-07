var api = require('../../modules/api');
var ViewData = require('../../app/views/Base.data.js');


module.exports = function (req) {
    var data = new ViewData(req, 'Enter Employment History', 'EducatorTenure');
    return data;
    /*
    var educatorID = req.user.LinkedEducatorID;
    var ret = api.querySingle('Educator', [], null, { EducatorID: educatorID })
        .then(function (educator) {
            data.educator = educator;
            return data;
        });
    return ret;
    */
}