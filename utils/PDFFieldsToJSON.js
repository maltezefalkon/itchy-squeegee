/* completely untested; expects a path to a PDF and outputs JSON */

"use strict"

if (process.argv.length < 2) {
    throw new Error("PDF Path Required");
}

var spawn = require('child_process').spawn;
var pdftkPath = "C:\Program Files (x86)\PDFtk\bin\pdftk.exe";

var proc = spawn(pdftkPath, [process.argv[2], 'dump_data_fields']);

var leftover = '';
var json = '[ ';

proc.stdout.on('data', function (chunk) {
    var line = leftover;
    var pieces = chunk.split('\n');
    if (pieces.length > 1) {
        line += pieces[0];
        processLine(line);
    }
    leftover += pieces[pieces.length - 1];
})
.on('end', function () {
    json += '} ]';
    process.stdout.write(json);
});

function processLine(line) {
    if (line == '---' && json.length > 2) {
        json += '}, ';
    } else {
        json += ', ';
    }
    var pieces = line.split(':');
    json += '"' + pieces[0] + '": ';
    if (!pieces[1].match(/^[0-9]/)) {
        json += '"' + pieces[1] + '"';
    } else {
        json += pieces[1];
    }
}