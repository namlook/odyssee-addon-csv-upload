
var fs = require('fs');
var path = require('path');
var pump = require('pump');
var shell = require('shelljs');
var _ = require('lodash');

module.exports = function(server, config) {

    var db = server.plugins.eureka.database;
    var graphUri = config.serverConfig.database.config.graphUri;

    return {
        concurrency: 2,
        handler: function(job, done) {

            var filename = job.data.filename;
            var resource = job.data.resource;

            var infile = fs.createReadStream(filename);
            var parsedFileName = path.parse(filename);

            // All of these arguments are optional.
            var csvOptions = {
              delimiter: ',', // default is ,
              endLine: '\n', // default is \n,
              //  columns : ['columnName1', 'columnName2'] // by default read the first line and use values found as columns
              escapeChar: '"', // default is an empty string
              enclosedChar: '"' // default is an empty string
            };

            var output = shell.exec('wc -l '+filename, {silent: true}).output;
            var total = parseFloat(_.trim(output).split(' ')[0]);

            var csvStream = db.csvStreamParse(resource, infile, csvOptions);
            var writableStream = db.writableStream(resource, {dryRun: true, stripUnknown: true});

            var progress = 0;
            csvStream.on('data', function(item) {
                progress++;
                job.progress(progress, total);
            });

            pump(csvStream, writableStream, function(err) {
                if (err) {
                    if (err.message === 'Bad value') {
                        var lineNumber = parseFloat(err.line.count) + 1;
                        return done(JSON.stringify({
                            message: err.message,
                            lineNumber: err.line.count
                        }));
                    }
                    return done(err);
                }
                done();
            });
        }
    };
};
