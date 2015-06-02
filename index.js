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
  dirnames: {
    'static': [ path.join(process.cwd(), 'public') ],
    routes: [ path.join(process.cwd(), 'routes') ],
  },
  port: 5000,
  assign: (newConfig) => {
    Object.assign(config, newConfig);
  },
};

/**
 * Used to validate if experiments are enabled or not
 */
var delays = [];
/**
 * Used to validate if experiments are enabled or not
 */
var experimented = false;
/**
 * Used to make sure the express app is initialized before starting
 */
var initialized = false;

function wrapEvents(name, fn) {
  app.emit(`before.init.${name}`, registerDelay);
  fn();
  app.emit(`after.init.${name}`, registerDelay);

  function registerDelay(promise) {
    if (typeof promise.next !== 'function') return;
    delays.push(promise);
  }
}

function init() {

  initialized = true;

  app.emit('config', config);

  // Load static assets
  wrapEvents('static', () => {
    var dirs = config.dirnames.static;

    if (! Array.isArray(dirs)) dirs = [ dirs ];

    dirs.map((dir) => {
      app.use(express.static(dir));
    });
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

    delays.push(featureClient.announce()
      .catch(() => {
        // If there's no XPRMNTL Dashboard response,
        // I want to start the app anyway, just with the fallbacks
        return Promise.resolve();
      }));
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

  return Promise.all(delays)
    .then(appListen.bind(app, config.port))
    .then(() => {
      if (cb) cb();
    })
    .catch((err) => {
      console.error(err);
      if (cb) cb(err);

      throw err;
    });

  function appListen(port) {
    return new Promise((resolve, reject) => {
      app.listen(port, () => resolve());
    });
  }
}

export function use(modules) {
  if (! Array.isArray(modules)) modules = [ modules ];

  modules.map((module) => {
    app.on(module.event, module.handler);
  });
}

export default { app, start, init, wrap: wrapEvents, use }

export { init, start, wrapEvents as wrap, app, use };
