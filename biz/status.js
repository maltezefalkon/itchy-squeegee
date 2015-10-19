function StatusEnum(id, description, descriptionTemplate, glyphicon, colorClass, isOK, isBegun) {
    this.StatusID = id;
    this.Description = description;
    this.DescriptionTemplate = descriptionTemplate;
    this.Glyphicon = glyphicon;
    this.ColorClass = colorClass;
    this.IsOK = isOK;
    this.IsBegun = isBegun;
    this.getMarkup = function(statusDescription) {
        return '<div class="status text-' + this.ColorClass + '"><span class="glyphicon ' + this.Glyphicon + '"></span>&nbsp;' + (statusDescription || this.Description) + '</div>';
    };
}

// ------------------------------------------------------------------------------------ v
var DocumentStatus = {
    Missing: new StatusEnum(10, 'Missing', 'Missing', 'glyphicon-remove', 'danger', false, false),
    Valid: new StatusEnum(100, 'Valid', 'Valid', 'glyphicon-star', 'primary', false, true),
    Expired: new StatusEnum(50000, 'Expired', 'Expired', 'glyphicon-time', 'warning', false, true),
    Error: new StatusEnum(100000, 'Error', 'Error', 'glyphicon-remove-circle', 'danger', false, true),
    LookupByID: function (id) {
        for (var s in DocumentStatus) {
            if (DocumentStatus[s].StatusID == id) {
                return DocumentStatus[s];
            }
        }
        return undefined;
    },
    GetMinimum: function (array) {
        var ret = undefined;
        var minID = 99999999;
        for (var i in array) {
            var e = array[i];
            if (e instanceof StatusEnum) {
                if (e.StatusID < minID) {
                    ret = e;
                    minID = e.StatusID;
                }
            } else if (typeof e === 'Number' && Number(e) < minID) {
                ret = DocumentStatus.LookupByID(Number(e));
                minID = Number(e);
            }
        }
        return ret;
    },
    GetStatus: function (document) {
        return !document ? DocumentStatus.Missing : (
            document.RenewalDate > new Date() ? DocumentStatus.Valid : DocumentStatus.Expired
        );
    }

};

var SubmissionStatus = {
    Missing: new StatusEnum(10, 'Missing', 'Missing', 'glyphicon-remove', 'danger', false, false),
    Created: new StatusEnum(100, 'Ready to Submit', 'Ready to Submit', 'glyphicon-star', 'warning', false, true),
    AwaitingApproval: new StatusEnum(1000, 'Awaiting Approval', 'Awaiting Approval', 'glyphicon-hourglass', 'primary', false, true),
    Approved: new StatusEnum(5000, 'Approved', 'Approved', 'glyphicon-ok', 'success', true, true),
    Expired: new StatusEnum(50000, 'Expired', 'Expired', 'glyphicon-warning-sign', 'warning', false, true),
    Error: new StatusEnum(100000, 'Error', 'Error', 'glyphicon-remove-circle', 'danger', false, true),
    LookupByID: function (id) {
        for (var s in SubmissionStatus) {
            if (SubmissionStatus[s].StatusID == id) {
                return SubmissionStatus[s];
            }
        }
        return undefined;
    },
    GetMinimum: function (array) {
        var ret = undefined;
        var minID = 99999999;
        for (var i in array) {
            var e = array[i];
            if (e instanceof StatusEnum) {
                if (e.StatusID < minID) {
                    ret = e;
                    minID = e.StatusID;
                }
            } else if (typeof e === 'Number' && Number(e) < minID) {
                ret = SubmissionStatus.LookupByID(Number(e));
                minID = Number(e);
            }
        }
        return ret;
    },
    GetStatus: function (submission) {
        return !submission ? SubmissionStatus.Missing : submission.StatusID;
    }
};


if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = {
            DocumentStatus: DocumentStatus,
            SubmissionStatus: SubmissionStatus
        };
    }
    exports = {
        DocumentStatus: DocumentStatus,
        SubmissionStatus: SubmissionStatus
    };
}


