/*
 * GenerateFDF
 * 
 * Takes JSON from stdin and writes FDF to stdout
 * 
 */

var fdf = require('fdf');
var fs = require('fs');
var raw = '';

process.stdin
    .on('data', function (chunk) {
        raw += chunk;
    })
    .on('end', function () {
        var data = JSON.parse(raw);
        var generated = fdf.generate(data);
        process.stdout.write(generated);
    });
