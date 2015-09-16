var fs = require('fs');
var _ = require('lodash');

var headerTags = fs.readFileSync('app/views/HeadTags.html');
var pageHeader = fs.readFileSync('app/common/header.html');
var pageFooter = fs.readFileSync('app/common/footer.html');

module.exports = function (pageTitle) {
    this.pageTitle = pageTitle;
    this.headerTags = headerTags;
    this.pageHeader = pageHeader;
    this.pageFooter = pageFooter;
    this.pageMasthead = generatePageMasthead(pageTitle);
    this.formatDate = formatDate;
}

function generatePageMasthead(title) {
    return '<div class="page-header"><span class="h2">' + title + '</span></div>';
}

function formatDate(d) {
    var date = d ? ((d instanceof Date) ? d : new Date(d)) : new Date();
    return (date.getMonth() + 1).toString() + '/' + date.getDate() + '/' + date.getFullYear();
}

