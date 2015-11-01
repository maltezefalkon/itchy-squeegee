var api = require('../../modules/api');
var ViewData = require('../../app/views/Base.data.js');


module.exports = function (req) {
    var data = new ViewData(req, 'Enter Employment History', 'EducatorTenure');
    data.forceCurrent = !Boolean(req.user.InvitationID);
    data.pageMasthead = data.generatePageMasthead(data.forceCurrent ? 'Current Employment' : 'Employment History');
    data.pageInstructions = data.forceCurrent ?
        'In the fields below, please provide the information for your <b>current employer(s)</b> only.'
        : 'In the fields below, please provide the relevant information for <b>each past employer</b> where you had direct contact with children.';
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