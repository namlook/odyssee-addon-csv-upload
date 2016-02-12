import Ember from 'ember';
import layout from '../templates/components/widget-csv-upload';

const {Promise} = Ember.RSVP;

export default Ember.Component.extend({
    layout: layout,

    socketIOService: Ember.inject.service('socket-io'),
    connectionLost: false,

    init: function() {
        this._super.apply(this, arguments);

    //     var socket = this.get('socketIOService').socketFor('http://localhost:8888');
    //
    //     socket.on('connect', function() {
    //         this.set('connectionLost', false);
    //     }, this);
    //
    //     socket.on('disconnect', function() {
    //         this.set('connectionLost', true);
    //     }, this);
    },

    resources: Ember.computed(function() {
        return Ember.A();
    }),

    resourcesLoaderObserver: Ember.on('init', function() {
        let url = `/_private/resources`;

        let that = this;
        Ember.$.ajax({
            url: url,
            type: 'GET',
            contentType: false,
            processData: false,
            success(data) {
                let resources = Ember.A(data.resources.map((resourceName) => {
                    return Ember.Object.create({name: resourceName, status: null, file: null});
                }));
                that.set('resources', resources);
            },
            error(err) {
                console.error(err);
            }
        });
    }),

    error: null,
    isReadyForUpload: false,
    isImporting: false,

    resourceObserver: Ember.observer('resources.@each.status', function() {
        let resources = this.get('resources');
        let skippedResources = resources.filterBy('status', 'skipped');
        let validatedResources = resources.filterBy('status', 'validated');
        let importedResources = resources.filterBy('status', 'imported')
        let isReady = validatedResources.length && skippedResources.length + validatedResources.length + importedResources.length === resources.length;
        this.set('isReadyForUpload', isReady);

        let importingResources = resources.filterBy('status', 'importing');
        let isImporting = importingResources.length
        this.set('isImporting', isImporting);
    }),



    processFile(resource) {
        return new Promise((resolve, reject) => {
            let data = new FormData();
            data.append('file', resource.file);
            let url = `/_private/import/${resource.name}`;

            Ember.$.ajax({
                url: url,
                type: 'POST',
                data: data,
                cache: false,
                contentType: false,
                processData: false,
                success() {
                    resolve();
                },
                error(err) {
                    reject(err);
                }
            });
        });
    },

    actions: {
        upload() {
            this.setProperties({
                isImporting: true,
                error: null
            });
            if (!this.get('isReadyForUpload')) {
                return;
            }

            let promises = this.get('resources').map((resource) => {
                if (resource.get('status') === 'validated') {
                    resource.set('status', 'importing');
                    resource.set('importing', true);
                    resource.set('isLoading', true);
                    return this.processFile(resource);
                }
            });

            Promise.all(promises).catch((err) => {

                let error;
                if (err.readyState === 0) {
                    error = {message: 'cannot connect to server'};
                } else {
                    err = err.responseJSON.errors[0];
                    let message = err.detail;
                    let detail = err.meta && err.meta.infos.extra || null;
                    error = {
                        message: message,
                        detail: detail
                    };
                }

                this.setProperties({
                    error: error,
                });
            });
        }
    }
});
