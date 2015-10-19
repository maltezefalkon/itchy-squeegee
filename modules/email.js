var rest = require('restling');
var api = require('./api.js');
var myurl = require('./myurl.js');
var DocumentStatus = require('../biz/status.js').DocumentStatus;
var SubmissionStatus = require('../biz/status.js').SubmissionStatus;
var log = require('./logging.js')('email');
var _ = require('lodash');

var overrideEmailRecipient = process.env.OVERRIDE_EMAIL_RECIPIENT;

var mailgunDomain = process.env.MAILGUN_DOMAIN;
var mailgunAPIKey = process.env.MAILGUN_API_KEY;

var mailgunAPIPostUrl = 'https://api.mailgun.net/v3/' + mailgunDomain + '/messages';
var mailgunUsername = 'api';
var mailgunPassword = mailgunAPIKey;
var mailgunAuthorizationHeaderValue = 'Basic YXBpOmtleS0zMTI1N2U2MTA2ZGQ3Njc0NTRhYTAwYjcxZTEwY2RjMA==';

var formerEmployerTemplate = 
 '<%=doc.Educator.FirstName%> <%=doc.Educator.LastName%> is applying to work ' +
 'at <%=doc.ApplicableTenure.Organization.Name%>.  Please click this link ' +
 'to complete <%=doc.Definition.Name%>.\n\n' +
 '<%=url%>' +
 '\n\nThank you.';
var compiledFormerEmployerTemplate = _.template(formerEmployerTemplate);

var applicationOrganizationTemplate = 
 '<%=doc.ReferenceTenure.Organization.Name%> has completed their portion of ' +
 '<%=doc.Definition.Name%> with reference to the application submitted by ' +
 '<%=doc.Educator.FirstName%> <%=doc.Educator.LastName%> for the position of ' +
 '<%=doc.ApplicableTenure.PositionsHeld%> at <%=doc.ApplicableTenure.Organization.Name%>.'
 'Click below to go to the Organization Dashboard and view the current status ' +
 'of the clearance documents.\n\n' +
 '<%=url%>' +
 '\n\nThank you.';
var compiledApplicationOrganizationTemplate = _.template(applicationOrganizationTemplate);

module.exports.sendForm168EmailToFormerEmployer = SendForm168EmailToFormerEmployer;
module.exports.sendForm168EmailToApplicationOrganization = SendForm168EmailToApplicationOrganization;

function SendForm168EmailToFormerEmployer(documentInstance) {
    var fromAddress = documentInstance.Educator.EmailAddress;
    var toAddress = overrideEmailRecipient || documentInstance.ReferenceTenure.Organization.EmailAddress;
    var educatorName = documentInstance.Educator.FirstName + ' ' + documentInstance.Educator.LastName;
    var subject = documentInstance.Definition.Name + ' for ' + educatorName;
    
    var restOptions = {
        method: 'POST',
        data: {
            from: fromAddress,
            subject: subject,
            to: toAddress,
            text: compiledFormerEmployerTemplate(
                {
                    url: myurl.createUrl(myurl.createUrlType.FillForm, { DocumentInstanceID: documentInstance.DocumentInstanceID, Section: 'FormerOrganization' }),
                    doc: documentInstance
                }),
        },
        username: mailgunUsername,
        password: mailgunPassword,
        multipart: true
    };
    
    log.debug({ emailPostInformation: restOptions }, 'generating POST for MailGun to send form 168');

    return rest.post(mailgunAPIPostUrl, restOptions).then(
        function (json) {
            var message = json.data.message;
            if (json.response.statusCode == 200) {
                var emailID = json.data.id;
                documentInstance.EmailID = emailID;
                documentInstance.StatusID = DocumentStatus.EmailToFormerEmployerSent.StatusID;
                documentInstance.StatusDescription = _.template(DocumentStatus.EmailToFormerEmployerSent.DescriptionTemplate)(documentInstance);
                return api.save(documentInstance);
            } else {
                documentInstance.StatusID = DocumentStatus.Error.StatusID;
                documentInstance.StatusDescription = message;
                return api.save(documentInstance);
            }
        }
    );
}

function SendForm168EmailToApplicationOrganization(documentInstance) {
    var fromAddress = documentInstance.Educator.EmailAddress;
    var toAddress = overrideEmailRecipient || documentInstance.ReferenceTenure.Organization.EmailAddress;
    var educatorName = documentInstance.Educator.FirstName + ' ' + documentInstance.Educator.LastName;
    var subject = documentInstance.Definition.Name + ' for ' + educatorName;
    
    var restOptions = {
        method: 'POST',
        data: {
            from: fromAddress,
            subject: subject,
            to: toAddress,
            text: compiledApplicationOrganizationTemplate(
                {
                    url: myurl.createUrl(myurl.createUrlType.OrganizationDashboard, { OrganizationID: documentInstance.ApplicableTenure.OrganizationID }),
                    doc: documentInstance
                }),
        },
        username: mailgunUsername,
        password: mailgunPassword,
        multipart: true
    };
    
    log.debug({ emailPostInformation: restOptions }, 'generating POST for MailGun to send form 168');
    
    return rest.post(mailgunAPIPostUrl, restOptions).then(
        function (json) {
            var message = json.data.message;
            if (json.response.statusCode == 200) {
                var emailID = json.data.id;
                documentInstance.EmailID = emailID;
                documentInstance.StatusID = DocumentStatus.CompletedByFormerEmployer.StatusID;
                documentInstance.StatusDescription = _.template(DocumentStatus.CompletedByFormerEmployer.DescriptionTemplate)(documentInstance);
                return api.save(documentInstance);
            } else {
                documentInstance.StatusID = DocumentStatus.Error.StatusID;
                documentInstance.StatusDescription = message;
                return api.save(documentInstance);
            }
        }
    );
}

