
var fs = require('fs');
var path = require('path');
var csv = require('csv-stream');
var pump = require('pump');
var shell = require('shelljs');
var archimedesUtils = require('archimedes/lib/adapters/rdf/utils');
var os = require('os');
var _ = require('lodash');

module.exports = function(server, config) {

    var dbConf = config.serverConfig.database.config;
    var graphUri = dbConf.graphUri;
    var db = server.plugins.eureka.database;

    return function(job, done) {

        var filename = job.data.filename;
        var resource = job.data.resource;

        var infile = fs.createReadStream(filename);
        var parsedFileName = path.parse(filename);
        var outfileName = path.resolve(os.tmpDir(), parsedFileName.name+'.trig');

        var outfile = fs.createWriteStream(outfileName);

        // All of these arguments are optional.
        var options = {
          delimiter: ',', // default is ,
          endLine: '\n', // default is \n,
          //  columns : ['columnName1', 'columnName2'] // by default read the first line and use values found as columns
          escapeChar: '"', // default is an empty string
          enclosedChar: '"' // default is an empty string
        };

        var csvTransform = csv.createStream(options);
        var instanceTransform = archimedesUtils.instanceStreamWriter(db, resource);

        var rdfTransform;
        if (dbConf.engine === 'virtuoso') {
            rdfTransform = archimedesUtils.rdfStreamWriter(); // TODO dont pass the graphUri if you use virtuoso (duh!)
        } else {
            rdfTransform = archimedesUtils.rdfStreamWriter(graphUri);
        }

        var output = shell.exec('wc -l '+filename, {silent: true}).output;
        var total = parseFloat(_.trim(output).split(' ')[0]);

        var progress = 0;
        instanceTransform.on('data', function() {
            progress++;
            job.progress(progress, total);
        });

        csvTransform.on('error', function(error) {
            console.log('rdfTransform:error', error.stack);
            done(error);
        });

        instanceTransform.on('error', function(error) {
            console.log('rdfTransform:error', error.stack);
            done(error);
        });

        rdfTransform.on('error', function(error) {
            console.log('rdfTransform:error', error.stack);
            done(error);
        });

        outfile.on('error', function(error) {
            console.log('rdfTransform:error', error.stack);
            done(error);
        });

        pump(infile, csvTransform, instanceTransform, rdfTransform, outfile, function(err) {
            if (err) {
                console.error('pump:error:', err.stack);
                return done(err);
            }

            db.clearResource(resource).then(function() {

                encodedGraphUri = encodeURIComponent(graphUri);
                var url = 'http://'+dbConf.host+':'+dbConf.port+'/sparql-graph-crud-auth?graph-uri='+encodedGraphUri;
                shell.exec(
                    'curl --digest --user '+dbConf.auth.user+':'+dbConf.auth.password+' --url "'+url+'" -X POST -T '+outfileName+' --fail --silent --show-error 1>/dev/null',
                    // {silent: true},
                    function(code, stdout, stderr) {
                        if (code === 0) {
                            done();
                        } else {
                            done(new Error(stdout));
                        }
                    }
                );

            }).catch(function(error) {
                console.log('clearResource:error:', error);
                console.log(error.stack);
                done(error);
            });
        });
    };
};
