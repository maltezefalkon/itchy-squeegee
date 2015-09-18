module.exports = function (subject, fileName) {
    return new PerformanceTimer(subject, fileName);
}

function PerformanceTimer(subject, fileName) {
    var log = require('./logging.js')(subject || 'perf', fileName);
    var dict = {};
    this.start = function (timerName) {
        dict[timerName] = process.hrtime();
    };
    this.stop = function (timerName) {
        var v = dict[timerName];
        if (!v) {
            throw new Error('Failed to find timer named "' + timerName + '"');
        }
        var result = process.hrtime(v);
        dict[timerName] = result;
        log.info({ timer: timerName, seconds: Number(result[0]) + (Number(result[1]) / 1000000000) });
    };
}