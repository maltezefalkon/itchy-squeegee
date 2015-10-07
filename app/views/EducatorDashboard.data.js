var api = require('../../modules/api');
var ViewData = require('../../app/views/Base.data.js');
var Status = require('../../biz/status');

module.exports = function (req) {
    return api.querySingle('Educator', ['Tenures.Organization', 'Tenures.ApplicableDocuments.Definition'], null, { EducatorID: req.user.LinkedEducatorID })
        .then(function (educator) {
            var ret = new ViewData(req, 'Educator Dashboard');
            ret.educator = educator;
            ret.IsApplication = IsApplication;
            ret.IsCurrentTenure = IsCurrentTenure;
            ret.GetRank = GetRank;
            ret.GetStatusIcon = GetStatusIcon;
            ret.GetStatusColor = GetStatusColor;
            ret.Status = Status;
            return ret;
        });
}

function IsApplication(tenure) {
    return !tenure.StartDate;
}

function IsCurrentTenure(tenure) {
    return tenure.StartDate && !tenure.EndDate;
}

function GetRank(tenure) {
    if (IsApplication(tenure)) {
        return 1;
    } else if (IsCurrentTenure(tenure)) {
        return 2;
    } else {
        return 3;
    }
}

function GetStatusIcon(document) {
    switch (document.StatusID) {
        case Status.Missing.ID: return 'glyphicon-ban-circle';
        case Status.CompletedByApplicant.ID: return 'glyphicon-star';
        case Status.EmailToFormerEmployerSent.ID: return 'glyphicon-envelope';
        case Status.AwaitingResponse.ID: return 'glyphicon-hourglass';
        case Status.CompletedByFormerEmployer.ID: return 'glyphicon-ok';
        case Status.Expired.ID: return 'glyphicon-warning-sign';
    }
}

function GetStatusColor(document) {
    switch (document.StatusID) {
        case Status.Missing.ID: return 'text-danger';
        case Status.CompletedByApplicant.ID: return 'text-info';
        case Status.EmailToFormerEmployerSent.ID: return 'text-warning';
        case Status.AwaitingResponse.ID: return 'text-primary';
        case Status.CompletedByFormerEmployer.ID: return 'text-success';
        case Status.Expired.ID: return 'text-danger';
    }
}

