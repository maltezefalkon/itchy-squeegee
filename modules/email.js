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

var userActivationTemplate =
 'Thank you for creating an account at ClearanceManagement.com.\n\nPlease click ' + 
 'the following link to complete the registration process:\n\n' +
 '<%=url%>';
var compiledUserActivationTemplate = _.template(userActivationTemplate);

var passwordResetTemplate =
 'We have received a request to reset the password for the user with the email address ' +
 '<%=email%>. If you would like to complete this process, please use the link below ' +
 'to create a new password for your account.\n\n' + 
 '<%=url%>';
var compiledPasswordResetTemplate = _.template(passwordResetTemplate);

module.exports.sendForm168EmailToFormerEmployer = SendForm168EmailToFormerEmployer;
module.exports.sendForm168EmailToApplicationOrganization = SendForm168EmailToApplicationOrganization;
module.exports.sendUserConfirmationEmail = SendUserConfirmationEmail;
module.exports.sendEmail = SendEmail;
module.exports.sendPasswordResetEmail = SendPasswordResetEmail;

function SendEmail(purpose, fromAddress, toAddress, subject, body) {
    var restOptions = {
        method: 'POST',
        data: {
            from: fromAddress,
            subject: subject,
            to: toAddress,
            text: body
        },
        username: mailgunUsername,
        password: mailgunPassword,
        multipart: true
    };
    
    log.info({ purpose: purpose, emailPostInformation: restOptions }, 'generating POST for MailGun to send email for ' + purpose);
    
    return rest.post(mailgunAPIPostUrl, restOptions);
}

function SendUserConfirmationEmail(user) {
    // if passed an ID, query the object
    if (typeof user === 'string') {
        api.querySingle('User', ['Invitation'], null, { UserID: user }).then(function (u) {
            return SendUserConfirmationEmail(u);
        });
    } else {
        var body = compiledUserActivationTemplate({
            url: myurl.createUrl(myurl.createUrlType.ConfirmUser, [user.UserID], { conf: user.ConfirmationID }, false)
        });
        return SendEmail(
            'User confirmation', 
            'noreply@' + myurl.domainName, 
            overrideEmailRecipient || user.EmailAddress,
            'Activate your account at ' + myurl.domainName, 
            body);
    }
}

function SendPasswordResetEmail(user) {
    var body = compiledPasswordResetTemplate({
        url: myurl.createUrl(myurl.createUrlType.ResetPassword, [user.UserID], { reset: user.PasswordResetID }, false),
        email: user.EmailAddress
    });
    return SendEmail(
        'Password reset',
        'noreply@' + myurl.domainName,
        overrideEmailRecipient || user.EmailAddress,
        'Password reset for your account at ' + myurl.domainName,
        body);
}

function SendForm168EmailToFormerEmployer(documentInstance) {
    var fromAddress = documentInstance.Educator.EmailAddress;
    var toAddress = overrideEmailRecipient || documentInstance.ReferenceTenure.Organization.EmailAddress;
    var educatorName = documentInstance.Educator.FirstName + ' ' + documentInstance.Educator.LastName;
    var subject = documentInstance.Definition.Name + ' for ' + educatorName;
    var body = compiledFormerEmployerTemplate(
        {
            url: myurl.createUrl(myurl.createUrlType.FillForm, { DocumentInstanceID: documentInstance.DocumentInstanceID, Section: 'FormerOrganization' }),
            doc: documentInstance
        });

    var promise = SendEmail('Form168 to Former Employer for DocumentInstanceID ' + documentInstance.DocumentInstanceID, fromAddress, toAddress, subject, body);

    return promise.then(
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
    var body = compiledApplicationOrganizationTemplate(
        {
            url: myurl.createUrl(myurl.createUrlType.OrganizationDashboard, { OrganizationID: documentInstance.ApplicableTenure.OrganizationID }),
            doc: documentInstance
        });
    
    var promise = sendEmail('Form168 to Application Organization for DocumentInstanceID ' + documentInstance.DocumentInstanceID, fromAddress, toAddress, subject, body);

    return promise.then(
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

