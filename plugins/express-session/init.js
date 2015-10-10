/**
 * Intializer function
 */
import jack from '../../';
import expressSession from 'express-session';

export default function() {
  var config = this.config;

  var name = 'session';
  var handler = () => {
    let config = this.config;

    let name = config.name;
    let secret = config.secret;
    let store = config.store;

    let sessionConfig = {
      key: name,
      secret: secret,
      resave: false,
      saveUninitialized: false
    };

    if (store) sessionConfig.store = store;

    jack.app.use(expressSession(sessionConfig));
  };

  if (config.useAfter) return jack.useAfter(config.useAfter, name, handler);
  if (config.useBefore) return jack.useBefore(config.useBefore, name, handler);
}
