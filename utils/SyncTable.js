"use strict"

process.chdir('./utils');

var meta = require('../modules/metadata.js')('../metadata');

var typeKeys = [];

if ('*' === process.argv[2]) {
    for (var tk in meta.Metadata) {
        typeKeys.push(tk);
    }
} else if (process.argv.length > 1) {
    for (var i = 2; i < process.argv.length; i++) {
        typeKeys.push(process.argv[i]);
    }
} else {
    throw new Error('expected table name(s) or "*"');
}


var promise = meta.Sequelize.query('SET FOREIGN_KEY_CHECKS=0;');

typeKeys.forEach(function (tk) {
    promise = promise.then(function () {
        process.stdout.write(tk + '\n');
        return meta.db[tk].sync({ force: true });
    });
});

promise.then(function () {
    return meta.Sequelize.query('SET FOREIGN_KEY_CHECKS=1;')
});

promise.then(function () {
    process.stdout.write('complete!\n');
    process.exit(0);
}, function () {
    process.stderr.write(err);
    process.exit(1);
});
