require('babel').transform('code', { optional: ['runtime'] });

/**
 * Native components
 */
import path from 'path';

/**
 * Module Dependencies
 */
import bodyParser from 'body-parser';
import compress from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import expressSession from 'express-session';
import methodOverride from 'method-override';
import morgan from 'morgan';
import Promise from 'bluebird';
import featureClient from 'feature-client';
import xprExpress from 'xpr-express';
import xprToggle from 'xpr-toggle';

/**
 * Local Dependencies
 */

/**
 * Local Constants
 */
const app = express();

/**
 * This config object will be overridable during the `config` event
 */
var config = {
  cookie: {
    secret: 'You put the lime in the coconut',
  },
  session: {
    name: 'sessionID',
    secret: 'What would the fox say if he knew...?',
    getStore: (expressSession) => {
      console.warn('\n\n\nExpress MemoryStore should not be used in production...\n\n\n');
    }
  },
  bodyParser: {
    urlencoded: {
      extended: false,
    }
  },
  morgan: 'dev',
  staticDir: path.join(process.cwd(), 'public'),
  port: 5000,
  assign: (newConfig) => {
    Object.assign(config, newConfig);
  },
};

/**
 * Used to make sure the express app is initialized before starting
 */
var initialized = false;
/**
 * Used to validate if experiments are enabled or not
 */
var experimented = false;

function wrapEvents(name, fn) {
  app.emit(`before.init.${name}`);
  fn();
  app.emit(`after.init.${name}`);
}

function init() {

  initialized = true;

  app.emit('config', config);

  // Load static assets
  wrapEvents('static', () => {
    app.use(express.static(config.staticDir));
  });

  // Log everything after this
  wrapEvents('logging', () => {
    app.use(morgan(config.morgan));
  });

  // req.cookie
  wrapEvents('cookie', () => {
    app.use(cookieParser(config.cookie.secret));
  });

  // req.user
  wrapEvents('session', () => {
    let store = config.session.getStore(expressSession);
    let sessionConfig = {
      key : config.session.name,
      secret : config.session.secret,
      resave: false,
      saveUninitialized: false,
    };

    if (store) sessionConfig.store = store;

    app.use(expressSession(sessionConfig));
  });

  // Req.feature
  wrapEvents('xprmntl', () => {
    let xprConfig = config.experiments;

    experimented = !! xprConfig;

    if (! experimented) return;
    if (Array.isArray(xprConfig)) xprConfig = { experiments: xprConfig };

    featureClient.use(xprExpress());
    featureClient.use(xprToggle());
    featureClient.configure(xprConfig);

    app.use(featureClient.express);
    app.use(featureClient.toggle);
  });

  // parse application/json
  wrapEvents('json', () => {
    app.use(bodyParser.json(config.bodyParser.json));
  });

  // parse application/x-www-form-urlencoded
  wrapEvents('urlencoded', () => {
    app.use(bodyParser.urlencoded(config.bodyParser.urlencoded));
  });

  // Fake PUT and DELETE when clients don't support
  wrapEvents('override', () => {
    app.use(methodOverride(config.methodOverride));
  });

  // GZip all of our responses
  wrapEvents('compress', () => {
    app.use(compress(config.compression));
  });

  // Any routing level stuff
  wrapEvents('routing', () => {});

}

export function start(cb) {
  if (! initialized) init();

  let _promise = experimented ? featureClient.announce() : Promise.resolve();

  return _promise
    .finally(appListen.bind(app, config.port))
    .then(() => {
      if (cb) cb();
    });

  function appListen(port) {
    return new Promise((resolve, reject) => {
      app.listen(port, () => resolve());
    });
  }
}

export { init, start, wrapEvents as wrap, app, app as default };
