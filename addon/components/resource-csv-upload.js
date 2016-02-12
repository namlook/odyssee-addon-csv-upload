import Ember from 'ember';
import layout from '../templates/components/resource-csv-upload';

export default Ember.Component.extend({
    layout: layout,
    tagName: 'tr',
    classNameBindings: ['trClass'],

    trClass: Ember.computed('resource.status', function() {
        let status = this.get('resource.status');
        if (status === 'error') {
            return 'danger';
        } else if (status === 'skipped') {
            return 'warning';
        } else if (status === 'validated' || status == 'imported') {
            return 'success';
        }
        return '';
    }),

    socketIOService: Ember.inject.service('socket-io'),

    init: function() {
        this._super.apply(this, arguments);

        var socket = this.get('socketIOService').socketFor('http://localhost:8888');

        socket.on('connect', function() {
            socket.on('upload-csv', this.handleMessages, this);
        }, this);
    },

    error: null,
    isLoading: Ember.computed.alias('resource.isLoading'),

    resource: null,

    file: null,

    handleMessages: function(message) {
        if (message.resource === this.get('resource.name')) {
            let resource = this.get('resource');
            let file = this.get('file');

            switch (message.status) {
                case 'validating':
                    this.set('isLoading', true);
                    resource.setProperties({
                        validating: true,
                        validated: false,
                        imported: false,
                        importing: false,
                        status: false,
                        progress: null,
                        isLoading: true
                    });
                    break;

                case 'importing':
                    this.set('isLoading', true);
                    resource.setProperties({
                        status: 'importing',
                        importing: true,
                        validating: false,
                        imported: false,
                        validated: false,
                        progress: null,
                        isLoading: true
                    });
                    break;

                case 'progress':
                    resource.set('progress', message.progress);
                    break;

                case 'validated':
                    this.set('isLoading', false);
                    resource.setProperties({
                        file: file,
                        status: 'validated',
                        validated: true,
                        validating: false,
                        importing: false,
                        imported: false,
                        progress: null
                    });
                    break;

                    case 'imported':
                        this.set('isLoading', false);
                        resource.setProperties({
                            status: 'imported',
                            imported: true,
                            validating: false,
                            validated: false,
                            importing: false,
                            progress: null
                        });
                        break;

                case 'error':

                    // let error;
                    // if (err.readyState === 0) {
                    //     error = {message: 'cannot connect to server'};
                    // } else {
                    //     err = err.responseJSON.errors[0];
                    //     let message = err.detail;
                    //     let detail = err.meta && err.meta.infos.extra || null;
                    //     error = {
                    //         message: message,
                    //         detail: detail
                    //     };
                    // }

                    let error = Ember.Object.create(JSON.parse(message.error));

                    this.setProperties({
                        isLoading: false,
                        error: error
                    });
                    resource.set('status', 'error');
                    break;

                default:
                    console.log('bad message.status ?');
            }
        }
    },



    disabledFileInput: Ember.computed('resource.status', function() {
        if (this.get('resource.status')) {
            return 'disabled';
        }
        return '';
    }),

    actions: {
        reset() {
            this.setProperties({
                file: null,
                isLoading: false,
                error: null,
            });
            let resource = this.get('resource');
            resource.setProperties({
                file: null,
                status: null,
                validating: false,
                importing: false,
                progress: null
            });
        },

        skip() {
            let resource = this.get('resource');
            resource.setProperties({
                status: 'skipped',
                file: null
            });
        },

        submit() {
            let resourceName = this.get('resource.name');
            let file = this.get('file');

            if (file) {
                this.set('isLoading', true);
                let data = new FormData();
                data.append('file', file);
                let url = `/_private/validate/${resourceName}`;

                let that = this;
                Ember.$.ajax({
                    url: url,
                    type: 'POST',
                    data: data,
                    cache: false,
                    contentType: false,
                    processData: false,
                    success() {
                        // that.set('isLoading', false);
                        // let resource = that.get('resource');
                        // resource.setProperties({
                        //     file: file,
                        //     status: 'ok'
                        // });
                    },
                    error(err) {
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

                        that.setProperties({
                            isLoading: false,
                            error: error
                        });
                        let resource = that.get('resource');
                        resource.set('status', 'error');
                    }
                });
            }
        }
    }

});
