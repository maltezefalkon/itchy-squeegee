var rest = require('restling');
var api = require('./api.js');
var myurl = require('./myurl.js');
var _ = require('lodash');

var mailgunDomain = process.env.MAILGUN_DOMAIN;
var mailgunAPIKey = process.env.MAILGUN_API_KEY;

var mailgunAPIPostUrl = 'https://api.mailgun.net/v3/' + mailgunDomain + '.mailgun.org/messages';
var mailgunUsername = 'api';
var mailgunPassword = mailgunAPIKey;
var mailgunAuthorizationHeaderValue = 'Basic YXBpOmtleS0zMTI1N2U2MTA2ZGQ3Njc0NTRhYTAwYjcxZTEwY2RjMA==';

var template = 
 '<%=doc.Educator.FirstName%> <%=doc.Educator.LastName%> is applying to work ' +
 'at <%=doc.ApplicableTenure.Organization.Name%>.  Please click this link ' +
 'to complete <%=doc.Definition.Name%>.\n\n' +
 '<%=url%>' +
 '\n\nThank you.';
var compiledTemplate = _.template(template);

module.exports.sendForm168ToFormerEmployer = SendForm168ToFormerEmployer;

function SendForm168ToFormerEmployer(documentInstance) {
    var educatorName = documentInstance.Educator.FirstName + ' ' + documentInstance.Educator.LastName;
    var fromAddress = documentInstance.Educator.EmailAddress;
    var toAddress = documentInstance.ReferenceTenure.Organization.EmailAddress;
    var subject = documentInstance.Definition.Name + ' for ' + educatorName;
    var prospectiveEmployer = doucmentInstance.ApplicableTenure.Organization.Name;
    var text = educatorName + ' is applying to work at ' + prospectiveEmployer;
    
    var restOptions = {
        method: 'POST',
        data: {
            from: fromAddress,
            subject: subject,
            to: toAddress,
            text: compiledTemplate(
                {
                    url: myurl.createUrl(myurl.createUrlType.FormFill, { DocumentInstanceID: documentInstance.DocumentInstanceID }),
                    doc: documentInstance
                }),
        },
        username: mailgunUsername,
        password: mailgunPassword,
        multipart: true
    };

    return rest.post(mailgunAPIPostUrl, restOptions).then(
        function (json) {
            var emailID = json.id;
            var message = json.message;
            documentInstance.EmailID = emailID;
            return api.save(documentInstance);
        }
    );
}