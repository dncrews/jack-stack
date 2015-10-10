/**
 * Intializer function
 */
import bodyParser from 'body-parser';
import jack from '../../';

module.exports = function() {
  var config = this.config;


  jack.useAfter('config', 'bodyParser', (data) => {
    // Configure Olympus, the stack, or the app here
    var app = data.app;

    app.use(bodyParser.json(config.json));
    app.use(bodyParser.urlencoded(config.urlencoded));
  });
};
