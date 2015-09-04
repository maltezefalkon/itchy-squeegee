
process.chdir('./utils');

var log = require('../modules/logging.js')('RebuildDatabase');
var meta = require('../modules/metadata.js')('../metadata');

var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));

var directory = '../referenceData';

meta.Sequelize.sync({ force: true })
    .then(function () {
    return getFiles().map(function (fileName) {
        return getData(fileName).then(function (info) {
            log.debug({ info: info }, 'reading file')
            var typeKey = info.fileName.substr(3, info.fileName.length - ('.json'.length + 3));
            var data = JSON.parse(info.content.trim());
            if (data instanceof Array) {
                data.forEach(function (o) {
                    o['_TypeKey'] = typeKey;
                });
            } else {
                data['_TypeKey'] = typeKey;
            }
            return data;
        });
    }).then(function (data) {
        log.debug({ data: data }, 'saving objects');
        return saveObjects(data);
    });
}).then(function () {
    process.stdout.write('Completed successfully.');
    process.exit(0);
}, function (err) {
    process.stderr.write(err);
    process.exit(1);
});

function getFiles() {
    return fs.readdirAsync(directory);
}

function getData(fileName) {
    return fs.readFileAsync(directory + '/' + fileName, 'utf8').then(
        function (content) {
            return { fileName: fileName, content: content };
        }
    );
}

function saveObjects(maybeArray) {
    if (maybeArray instanceof Array) {
        var ret = Promise.resolve();
        maybeArray.forEach(function (o) {
            ret = ret.then(function () { return saveObjects(o); });
        });
        return ret;
    } else {
        var typeKey = maybeArray['_TypeKey'];
        log.debug({ obj: maybeArray }, 'Saving ' + typeKey);
        return meta.db[typeKey].create(maybeArray).then(function () {
            log.debug('Success');
        });
    }
}