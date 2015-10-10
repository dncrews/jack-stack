import jack from '../../';
import featureClient from 'feature-client';
import xprExpress from 'xpr-express';
import xprToggle from 'xpr-toggle';

module.exports = function() {
  var config = this.config;
  jack.useAfter('session', 'xprmntl', (data) => {
    // Configure Olympus, the stack, or the app here
    var app = data.app;

    let xprConfig = config.experiments;

    if (!xprConfig.length) return;

    if (Array.isArray(xprConfig)) xprConfig = { experiments: xprConfig };

    featureClient.use(xprExpress());
    featureClient.use(xprToggle());
    featureClient.configure(xprConfig);

    app.use(featureClient.express);
    app.use(featureClient.toggle);

    return featureClient.announce()
      .catch(() => {
        // If there's no XPRMNTL Dashboard response,
        // I want to start the app anyway, just with the fallbacks
        return Promise.resolve();
      });
  });
};
