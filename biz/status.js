function StatusEnum(id, description, descriptionTemplate, explanation, glyphicon, colorClass, isOK, isBegun) {
    this.StatusID = id;
    this.Description = description;
    this.DescriptionTemplate = descriptionTemplate;
    this.Explanation = explanation;
    this.Glyphicon = glyphicon;
    this.ColorClass = colorClass;
    this.IsOK = isOK;
    this.IsBegun = isBegun;
    this.getMarkup = function (statusDescription) {
        return '<div class="status text-' + this.ColorClass + '"><span class="glyphicon ' + this.Glyphicon + '"></span>&nbsp;' + (statusDescription || this.Description) + '</div>';
    };
}

function DocumentStatusEnum(id, description, descriptionTemplate, glyphicon, colorClass, isOK, isBegun) {
    StatusEnum.apply(this, arguments);
}

DocumentStatusEnum.prototype = new StatusEnum();
DocumentStatusEnum.prototype.constructor = DocumentStatusEnum;

function SubmissionStatusEnum(id, description, descriptionTemplate, glyphicon, colorClass, isOK, isBegun, isSubmitted) {
    StatusEnum.apply(this, arguments);
    this.IsSubmitted = isSubmitted;
}

SubmissionStatusEnum.prototype = new StatusEnum();
SubmissionStatusEnum.prototype.constructor = SubmissionStatusEnum;



// ------------------------------------------------------------------------------------ v
var DocumentStatus = {
    Missing: new DocumentStatusEnum(10, 'Missing', 'Missing', 'This document has not yet been completed.', 'glyphicon-remove', 'danger', false, false),
    Valid: new DocumentStatusEnum(100, 'Valid', 'Valid', 'This document has been saved to your account and is still valid.', 'glyphicon-star', 'primary', false, true, false),
    Expired: new DocumentStatusEnum(50000, 'Expired', 'Expired', 'This document has been saved to your account, but is no longer valid.', 'glyphicon-time', 'danger', false, true),
    Error: new DocumentStatusEnum(100000, 'Error', 'Error', 'There has been an error processing this document.', 'glyphicon-remove-circle', 'danger', false, true),
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
    Missing: new SubmissionStatusEnum(10, 'Missing', 'Missing', 'This document has not yet been completed.', 'glyphicon-remove', 'danger', false, false, false),
    Created: new SubmissionStatusEnum(100, 'Not Submitted', 'Not Submitted', 'This document has been completed but has not yet been sent to this organization.', 'glyphicon-exclamation-sign', 'danger', false, true, false),
    AwaitingApproval: new SubmissionStatusEnum(1000, 'Awaiting Approval', 'Awaiting Approval', 'This document has been submitted to this organization and is pending approval by that organization.', 'glyphicon-hourglass', 'primary', false, true, true),
    Error: new SubmissionStatusEnum(2000, 'Error', 'Error', 'There has been an error processing this document.', 'glyphicon-remove-circle', 'danger', false, true, false),
    Rejected: new SubmissionStatusEnum(3000, 'Rejected', 'Rejected', 'The submitted document was rejected by the organization it was submitted to.', 'glyphicon-ban-circle', 'danger', false, true, false),
    Expired: new SubmissionStatusEnum(4000, 'Expired', 'Expired', 'The document is no longer valid and needs to be renewed.', 'glyphicon-time', 'warning', false, true, true),
    Approved: new SubmissionStatusEnum(5000, 'Approved', 'Approved', 'The document is completed and approved by the organization.', 'glyphicon-ok', 'success', true, true, true),
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
            } else if (typeof e === 'number' && Number(e) < minID) {
                ret = SubmissionStatus.LookupByID(Number(e));
                minID = Number(e);
            }
        }
        return ret || SubmissionStatus.Missing;
    },
    GetStatus: function (submission) {
        return !submission ? SubmissionStatus.Missing : SubmissionStatus.LookupByID(submission.StatusID);
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


