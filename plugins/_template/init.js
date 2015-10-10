/**
 * Intializer function
 */
import jack from '../../';

module.exports = function() {
  jack.useAfter('config', 'cookie', (data) => {
    // Configure Olympus, the stack, or the app here
    var app = data.app;

    app.use((req, res) => {
      return res.send(418);
    });
  });
};
