/* Call with pairs of arguments that specify field names and values to append to 
 * objects parsed from stdin.  If an array, it will apply the same field name and 
 * value to every object in that array.  You can also specify one of the following
 * special values:
 *  "null": literal null
 *  "+": create an auto-incrementing, zero-based counter
 *  "UUID": generate a GUID
 *  "[xxx]": copies its value from existing field xxx
 * example:
 * type foo.json | node AddJSONField field1 value1 field2 null counter + guid UUID field3 [existing] > output.json
 */

var uuid = require('uuid');

var stdin = process.stdin;
var stdout = process.stdout;

var inputChunks = [];
var counter = 0;

stdin.resume();
stdin.setEncoding('utf8');

stdin.on('data', function (chunk) {
    inputChunks.push(chunk);
});

stdin.on('end', function () {
    var inputJSON = inputChunks.join(null);
    var inputObject = JSON.parse(inputJSON.trim());
    if (inputObject.constructor === Array) {
        for (var i = 0; i < inputObject.length; i++) {
            appendFields(inputObject[i]);
        }
    } else {
        appendFields(inputObject);
    }
    stdout.write(JSON.stringify(inputObject));
});

function appendFields(o) {
    for (var j = 0; j < process.argv.length - 2; j += 2) {
        var v = process.argv[j + 3];
        if (v === '+') {
            v = counter++;
        } else if (v === 'null') {
            v = null;
        } else if (v === 'UUID') {
            v = uuid();
        } else {
            var match = /\[([A-Za-z].*)\]/.exec(v);
            if (match) {
                v = o[match[1]];
            }
        }
        o[process.argv[j + 2]] = v;
    }
}