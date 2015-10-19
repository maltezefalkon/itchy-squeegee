var fs = require('fs');
var _ = require('lodash');
var myUrl = require('../../modules/myurl.js');

var headerTags = fs.readFileSync('app/views/Standard.HeadTags.html');
var pageHeader = _.template(fs.readFileSync('app/views/Standard.Header.html'));
var pageFooter = fs.readFileSync('app/views/Standard.Footer.html');
var uploadFunctionality = _.template(fs.readFileSync('app/views/Standard.Upload.html'));

module.exports = function (req, pageTitle, controllerName) {
    this.req = req;
    this.path = req.path;
    this.user = req.user;
    this.pageTitle = pageTitle;
    this.headerTags = headerTags;
    this.pageFooter = pageFooter;
    this.pageMasthead = generatePageMasthead(pageTitle);
    this.generatePageMasthead = generatePageMasthead;
    this.formatDate = formatDate;
    this.fatalError = null;
    this.redirect = null;
    this.createUrl = createUrl;
    this.createDefaultUrl = function () { return createDefaultUrl(this.user); };
    this.formControlGroupClasses = 'col-md-6';
    this.formControlLabelClasses = 'control-label col-sm-4 col-md-4';
    this.formControlFieldClasses = 'col-sm-8 col-md-8';
    //this.formControlGroupClasses = 'col-sm-6 col-lg-4';
    //this.formControlLabelClasses = 'control-label col-md-4';
    //this.formControlFieldClasses = 'col-md-8';
    if (controllerName) {
        this.angularTags = generateAngularIncludes(controllerName, false);
        this.advancedAngularTags = generateAngularIncludes(controllerName, true);
    }
    this.pageHeader = pageHeader(this);
    this.uploadFunctionality = uploadFunctionality(this);
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

function generateAngularIncludes(controllerName, includeAdvancedFormSupport) {
    var ret = '';
    if (includeAdvancedFormSupport) {
        ret += '<script type="text/javascript" src="/client/lib/jquery-ui-1.11.4.custom/jquery-ui.js"></script>\n';
    } else {
        ret += '<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>\n';
    }
    ret += '<script type="text/javascript" src="/client/lib/angular-1.4.4/angular.min.js"></script>\n';
    ret += '<script type="text/javascript" src="/client/lib/angular-1.4.4/angular-messages.min.js"></script>\n';
    ret += '<script type="text/javascript" src="/controllers/' + controllerName + '.controller.js"></script>\n';
    if (includeAdvancedFormSupport) {
        ret += '<script type="text/javascript" src="/client/lib/angular-ui-ui-validate-1.2.0/validate.min.js"></script>\n';
        ret += '<script type="text/javascript" src="/client/lib/angular-ui-ui-date-0.0.8/date.js"></script>\n';
        ret += '<script type="text/javascript" src="/client/lib/angular-ui-ui-mask-1.4.7/mask.min.js"></script>\n';
    }
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