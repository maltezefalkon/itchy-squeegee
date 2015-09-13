function StatusEnum(id, description, descriptionTemplate, isCompleted) {
    this.ID = id;
    this.Description = description;
    this.DescriptionTemplate = descriptionTemplate;
    this.IsCompleted = isCompleted;
}

// ------------------------------------------------------------------------------------ v
var Status = {
    Missing: new StatusEnum(10, 'Missing', 'Missing', false),
    CompletedByApplicant: new StatusEnum(100, 'Completed by Applicant', 'Completed by Applicant', false),
    EmailToFormerEmployerSent: new StatusEnum(1000, 'Email Sent to Former Employer', 'Email Sent to <%=ReferenceTenure.Organization.Name%>', false),
    AwaitingResponse: new StatusEnum(2000, 'Awaiting Response from Former Employer', 'Awaiting Response from <%=ReferenceTenure.Organization.Name%>', false),
    CompletedByFormerEmployer: new StatusEnum(3000, 'Completed by Former Employer', 'Completed by <%=ReferenceTenure.Organization.Name%>', true),
    ErrorContactingFormerEmployer: new StatusEnum(10100, 'Error Contacting Former Employer', 'Error Contacting <%=ReferenceTenure.Organization.Name%>', false),
    ErrorContactingApplicationOrganization: new StatusEnum(10200, 'Error Contacting Application Organization', 'Email Sent to <%=ApplicationTenure.Organization.Name%>', false),
    Expired: new StatusEnum(5000, 'Expired', 'Expired', false),
    EmailError: new StatusEnum(50000, 'Email Error', 'Email Error', false),
    LookupByID: function (id) {
        for (var s in Status) {
            if (Status[s].ID == id) {
                return s;
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
            } else if (Number(e) < minID) {

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