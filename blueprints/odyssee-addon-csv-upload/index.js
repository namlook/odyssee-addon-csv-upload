/*jshint node:true*/

// var install = require('install-if-needed');
// var Promise = require('bluebird');

module.exports = {
    description: '',

    // locals: function(options) {
    //   // Return custom template variables here.
    //   return {
    //     foo: options.entity.options.foo
    //   };
    // }

    normalizeEntityName: function() {
        // allows us to run ember -g odyssee-addon-csv-upload and not blow up
        // because ember cli normally expects the format
        // ember generate <entitiyName> <blueprint>
    },


    afterInstall: function(options) {
        // return new Promise(function(resolve, reject) {
        //     var proc = install({
        //         dependencies: [
        //             'csv-stream@0.1.3',
        //             'pump@1.0.1',
        //             'shelljs@0.5.3',
        //             'namlook/archimedes.git#v0.0.24',
        //             'lodash@3.10.1',
        //             'joi@7.2.3',
        //             'mime-types@2.1.7',
        //             'uuid@2.0.1'
        //         ],
        //         // devDependencies: []
        //         save: true,
        //         stdio: 'inherit'
        //     }, function(err) {
        //         if (err) {
        //             return reject(err);
        //         }
        //         return resolve();
        //     })
        // });

        var that = this;
        return this.addAddonToProject({
            name: 'ember-websockets', target: '2.0.1'
        }).then(function(){

            return that.addBowerPackagesToProject([
                {name: 'socket.io-client', target: '^1.4.5'}
            ]);

        });

        // return this.addPackagesToProject([
        //   { name: 'screenshot-server', target: '0.0.x' }
        // ]).then(function() {
        //   return this.addBowerPackagesToProject([
        //     { name: 'screenshot-client', target: '0.0.x' }
        //   ]);
        // }.bind(this));
    }
};
