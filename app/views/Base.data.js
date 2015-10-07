var fs = require('fs');
var _ = require('lodash');
var myUrl = require('../../modules/myurl.js');

var headerTags = fs.readFileSync('app/views/Standard.HeadTags.html');
var pageHeader = _.template(fs.readFileSync('app/views/Standard.Header.html'));
var pageFooter = fs.readFileSync('app/views/Standard.Footer.html');

module.exports = function (req, pageTitle, controllerName) {
    this.req = req;
    this.path = req.path;
    this.user = req.user;
    this.pageTitle = pageTitle;
    this.headerTags = headerTags;
    this.pageFooter = pageFooter;
    this.pageMasthead = generatePageMasthead(pageTitle);
    this.formatDate = formatDate;
    this.fatalError = null;
    this.redirect = null;
    this.createUrl = createUrl;
    this.createDefaultUrl = function () { return createDefaultUrl(this.user); };
    this.pageHeader = pageHeader(this);
    this.formControlGroupClasses = 'col-sm-6 col-lg-4';
    this.formControlLabelClasses = 'control-label col-md-4';
    this.formControlFieldClasses = 'col-md-8';
    if (controllerName) {
        this.angularTags = generateAngularIncludes(controllerName);
    }
}

function generatePageMasthead(title) {
    return '<div class="page-header"><span class="h2">' + title + '</span></div>';
}

function formatDate(d) {
    if (!d) {
        return null;
    } else {
        var date = d instanceof Date ? d : new Date(d);
        return (date.getMonth() + 1).toString() + '/' + date.getDate() + '/' + date.getFullYear();
    }
}

function generateAngularIncludes(controllerName) {
    var ret = '<script type="text/javascript" src="/client/lib/angular-1.4.4/angular.min.js"></script>\n';
    ret += '<script type="text/javascript" src="/client/lib/angular-1.4.4/angular-messages.min.js"></script>\n';
    ret += '<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>\n';
    ret += '<script type="text/javascript" src="/controllers/' + controllerName + '.controller.js"></script>\n';
    return ret;
}

function setFatalError(errorMessage) {
    this.errorMessage = errorMessage;
}

function createUrl(urlType, routeArgs, queryStringArgs) {
    return myUrl.createUrl(myUrl.createUrlType[urlType], routeArgs, queryStringArgs, true);
}

function createDefaultUrl(user) {
    return myUrl.createDefaultUrl(user);
}