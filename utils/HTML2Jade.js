var fs = require('fs');
var html2jade = require('html2jade');

fs.readdirSync('html').forEach(function (origFileName) {
    var html = fs.readFileSync('html/' + origFileName);
    var newFileName = origFileName.replace(/\.[^/.]+$/, '') + '.jade';
    
    html2jade.convertHtml(html, {}, function (err, jade) {
        fs.writeFileSync('jade/' + newFileName, jade);
    });
});