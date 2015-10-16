function StatusEnum(id, description, descriptionTemplate, isCompleted, isBegun) {
    this.ID = id;
    this.Description = description;
    this.DescriptionTemplate = descriptionTemplate;
    this.IsCompleted = isCompleted;
    this.IsBegun = isBegun;
}

// ------------------------------------------------------------------------------------ v
var Status = {
    Missing: new StatusEnum(10, 'Missing', 'Missing', false, false),
    CompletedByApplicant: new StatusEnum(100, 'Completed by Applicant', 'Completed by Applicant', false, true),
    EmailToFormerEmployerSent: new StatusEnum(1000, 'Email Sent to Former Employer', 'Email Sent to <%=ReferenceTenure.Organization.Name%>', false, true),
    AwaitingResponse: new StatusEnum(2000, 'Awaiting Response from Former Employer', 'Awaiting Response from <%=ReferenceTenure.Organization.Name%>', false, true),
    CompletedByFormerEmployer: new StatusEnum(3000, 'Completed by Former Employer', 'Completed by <%=ReferenceTenure.Organization.Name%>', true, true),
    Completed: new StatusEnum(5000, 'Completed', 'Completed', true, true),
    ErrorContactingFormerEmployer: new StatusEnum(10100, 'Error Contacting Former Employer', 'Error Contacting <%=ReferenceTenure.Organization.Name%>', false, true),
    ErrorContactingApplicationOrganization: new StatusEnum(10200, 'Error Contacting Application Organization', 'Email Sent to <%=ApplicableTenure.Organization.Name%>', false, true),
    EmailError: new StatusEnum(10300, 'Email Error', 'Email Error', false, true),
    Expired: new StatusEnum(50000, 'Expired', 'Expired', false, true),
    LookupByID: function (id) {
        for (var s in Status) {
            if (Status[s].ID == id) {
                return Status[s];
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
                if (e.ID < minID) {
                    ret = e;
                    minID = e.ID;
                }
            } else if (typeof e === 'Number' && Number(e) < minID) {
                ret = Status.LookupByID(Number(e));
                minID = Number(e);
            }
        }
        return ret;
    }
};


if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
        exports = module.exports = Status;
    }
    exports.Status = Status;
} 