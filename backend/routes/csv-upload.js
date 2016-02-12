
var joi = require('joi');
var _ = require('lodash');
var mimes = require('mime-types');
var path = require('path');
var os = require('os');
var fs = require('fs');
var uuid = require('uuid');

module.exports = function(server) {

    return {

        listResources: {
            path: '/_private/resources',
            method: 'GET',
            config: {
                validate: {
                    query: {
                        persist: joi.string()
                    }
                }
            },
            handler: function(request, reply) {
                // if (request.query.persist !== uploadSecretKey) {
                    // return reply.forbidden('not authorized');
                // }
                return reply.ok({
                    resources: Object.keys(request.db.registeredModels)
                });
            }
        },

        importResource: {
            path: '/_private/import/{resource}',
            method: 'POST',
            config: {
                validate: {
                    query: {
                        persist: joi.string(),
                        delimiter: joi.string().default(','),
                        escapeChar: joi.string(),
                        enclosedChar: joi.string()
                    }
                },
                payload: {
                    output: 'stream',
                    parse: true,
                    maxBytes: 100 * Math.pow( 1024, 2), // 100 Mo
                    allow: 'multipart/form-data'
                }
            },
            handler: function(request, reply) {
                // if (request.query.persist !== uploadSecretKey) {
                    // return reply.forbidden('not authorized');
                // }

                var resource = request.params.resource;
                var modelName = _.capitalize(_.camelCase(resource));
                var db = request.db;
                if (!db[modelName]) {
                    return reply.badRequest('unknown resource: "' + resource + '"');
                }

                var file = request.payload.file;
                if (!file && file.hapi) {
                    return reply.badRequest('file not found');
                }

                var mimeType = mimes.lookup(file.hapi.filename);
                if (mimeType !== 'text/csv') {
                    return reply.badRequest('the file should be in csv format');
                }

                var csvFileName = path.resolve(os.tmpDir(), file.hapi.filename);

                var ext = path.parse(csvFileName).ext;

                csvFileName = csvFileName+uuid.v1()+ext;

                var csvFile = fs.createWriteStream(csvFileName);

                request.payload.file.pipe(csvFile);

                request.payload.file.on('error', function(error) {
                    reply.badRequest(error);
                });

                request.payload.file.on('end', function() {

                    var importCsvTask = server.plugins.eureka.tasks['import-csv'];
                    var task = importCsvTask({
                        title: resource,
                        filename: csvFileName,
                        resource: modelName,
                        delimiter: request.query.delimiter,
                        escapeChar: request.query.escapeChar,
                        enclosedChar: request.query.enclosedChar
                    });

                    var socket = server.plugins.eureka.websocket;

                    task.on('enqueue', function(){
                        socket.emit('upload-csv', {
                            status: 'importing',
                            resource: resource
                        });
                        reply('ok');
                    });

                    task.on('failed', function(err) {
                        console.log('xxxxxx', err);
                        socket.emit('upload-csv', {
                            status: 'error',
                            resource: resource,
                            error: JSON.stringify({
                                message: err
                            })
                        });
                    });

                    task.on('complete', function(job){
                        socket.emit('upload-csv', {
                            status: 'imported',
                            resource: resource
                        });
                    });

                    task.on('progress', function(progress) {
                        socket.emit('upload-csv', {
                            status: 'progress',
                            resource: resource,
                            progress: progress
                        });
                    });
                });
            }
        },

        validateResource: {
            path: '/_private/validate/{resource}',
            method: 'POST',
            config: {
                validate: {
                    query: {
                        persist: joi.string(),
                        delimiter: joi.string().default(','),
                        escapeChar: joi.string(),
                        enclosedChar: joi.string()
                    }
                },
                payload: {
                    output: 'stream',
                    parse: true,
                    maxBytes: 100 * Math.pow( 1024, 2), // 100 Mo
                    allow: 'multipart/form-data'
                }
            },
            handler: function(request, reply) {
                var resource = request.params.resource;
                var modelName = _.capitalize(_.camelCase(resource));
                var db = request.db;

                if (!db[modelName]) {
                    return reply.badRequest('unknown resource: "' + resource + '"');
                }
                var file = request.payload.file;

                if (!file || !file.hapi) {
                    return reply.badRequest('file not found');
                }

                var mimeType = mimes.lookup(file.hapi.filename);

                if (mimeType !== 'text/csv') {
                    return reply.badRequest('the file should be in csv format');
                }

                var csvFileName = path.resolve(os.tmpDir(), file.hapi.filename);

                var ext = path.parse(csvFileName).ext;

                csvFileName = csvFileName+uuid.v1()+ext;

                var csvFile = fs.createWriteStream(csvFileName);

                request.payload.file.pipe(csvFile);

                request.payload.file.on('error', function(error) {
                    reply.badRequest(error);
                });

                request.payload.file.on('end', function() {

                    var socket = server.plugins.eureka.websocket;

                    var validateCsvTask = server.plugins.eureka.tasks['validate-csv'];

                    var task = validateCsvTask({

                        title: resource,
                        filename: csvFileName,
                        resource: modelName,
                        delimiter: request.query.delimiter,
                        escapeChar: request.query.escapeChar,
                        enclosedChar: request.query.enclosedChar


                    }).on('enqueue', function(job){
                        socket.emit('upload-csv', {
                            status: 'validating',
                            resource: resource
                        });
                        reply('ok');

                    }).on('failed attempt', function(err) {

                        console.log('xxxattemptxxx', err);
                        socket.emit('upload-csv', {
                            status: 'error',
                            resource: resource,
                            error: err
                        });

                    }).on('failed', function(err) {

                        console.log('xxxxxx', err);
                        socket.emit('upload-csv', {
                            status: 'error',
                            resource: resource,
                            error: err
                        });

                    }).on('complete', function(job){
                        socket.emit('upload-csv', {
                            status: 'validated',
                            resource: resource
                        });

                    }).on('progress', function(progress) {
                        socket.emit('upload-csv', {
                            status: 'progress',
                            resource: resource,
                            progress: progress
                        });
                    });

                });
            }
        }
    };
};
