// modules
var nstatic = require('node-static'),
    port = 8080,
    http = require('http');

// config
var file = new nstatic.Server('./public', {
    cache: 3600,
    gzip: true
});

// serve
http.createServer(function (request, response) {
    request.addListener('end', function () {
        console.log('Received request for ' + request.url);
        file.serve(request, response);
        console.log('Done');
    }).resume();
}).listen(port);