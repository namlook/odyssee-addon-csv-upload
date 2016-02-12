
var csvUploadRoutes = require('odyssee-addon-csv-upload/backend/routes/csv-upload');

module.exports = function(server) {

    var routes = csvUploadRoutes(server);

    server.route(routes.listResources);
    server.route(routes.importResource);
    server.route(routes.validateResource);
};
