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
import debugLib from 'debug';
import express, { Router as expRouter } from 'express';
import expressSession from 'express-session';
import featureClient from 'feature-client';
import glob from 'glob';
import methodOverride from 'method-override';
import morgan from 'morgan';
import Promise from 'bluebird';
import xprExpress from 'xpr-express';
import xprToggle from 'xpr-toggle';

/**
 * Local Dependencies
 */

/**
 * Local Constants
 */
const app = express();
const debug = debugLib('jack-stack');
const routerMatch = expRouter();

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
    getStore: () => {
      console.warn('\n\n\nExpress MemoryStore should not be used in production...\n\n\n');
    }
  },
  experiments: [ 'placeholderExperiment' ],
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
/**
 * Used for event short-names
 */
var registeredEvents = [];
/**
 * Used to log the initialization order of middleware, etc
 */
var initOrder = 1;

function wrap(name, fn) {
  registeredEvents.push(name);
  let eventData = {
    app,
    config,
    registerDelay,
  };

  app.emit(`before.${name}`, eventData);
  app.emit(`before.init.${name}`, registerDelay);
  console.log(`${initOrder++}: ${name}`);

  if (fn) fn();

  app.emit(`after.init.${name}`, registerDelay);
  app.emit(`after.${name}`, eventData);

  function registerDelay(promise) {
    if (typeof promise.next !== 'function') return;
    delays.push(promise);
  }
}

function init() {

  initialized = true;

  app.emit('config', config);

  wrap('config');

  // Req.cookie
  wrap('cookie', () => {
    debug('cookie');
    app.use(cookieParser(config.cookie.secret));
  });

  // Req.user
  wrap('session', () => {
    debug('session');

    let store = config.session.getStore(expressSession);

    config.session.store = store;
    let sessionConfig = {
      key: config.session.name,
      secret: config.session.secret,
      resave: false,
      saveUninitialized: false
    };

    if (store) sessionConfig.store = store;

    app.use(expressSession(sessionConfig));
  });

  // Load static assets
  wrap('static', () => {
    debug('static');
    var dirs = config.dirnames.static;

    if (!Array.isArray(dirs)) dirs = [ dirs ];

    dirs.map((dir) => {
      app.use(express.static(dir));
    });
  });

  // Log everything after this
  wrap('logging', () => {
    debug('logging');
    app.use(morgan(config.morgan));
  });

  // Req.feature
  wrap('xprmntl', () => {
    debug('xprmntl');
    let xprConfig = config.experiments;

    experimented = !!xprConfig;

    if (!experimented) return;
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

  // Parse application/json
  wrap('json', () => {
    debug('json');
    app.use(bodyParser.json(config.bodyParser.json));
  });

  // Parse application/x-www-form-urlencoded
  wrap('urlencoded', () => {
    debug('urlencoded');
    app.use(bodyParser.urlencoded(config.bodyParser.urlencoded));
  });

  // Fake PUT and DELETE when clients don't support
  wrap('override', () => {
    debug('override');
    app.use(methodOverride(config.methodOverride));
  });

  // GZip all of our responses
  wrap('compress', () => {
    debug('compress');
    app.use(compress(config.compression));
  });

  // Any routing level stuff
  wrap('routing', () => {
    debug('routing');
    let dirs = config.dirnames.routes;

    if (!Array.isArray(dirs)) dirs = [ dirs ];

    // Dir order matters
    dirs.forEach((dir) => {
      var dirFiles = {};

      glob.sync(path.join(dir, '**', '*.js'))
        .forEach((filename) => {
          let route = filename
            .replace(dir, '') // Get just the file
            .replace(/\.js$/, '') // Basename
            .replace(/index$/, ''); // And use index as './'
          dirFiles[ route ] = filename;
        });

      // Sort by the path, since '/' needs to come first
      Object.keys(dirFiles).sort().forEach((route) => {
        let filename = dirFiles[ route ];
        debug(route, filename);
        let file = require(filename);
        if (file instanceof routerMatch.constructor) return app.use(route, file);

        let instance = require(file);
        if (typeof instance === 'function' && instance.length === 2) return instance(app);

        console.error(`\n\n\nFile incompatible and not loaded: ${file}\n\n\n`);
      });
    });

    debug('routing done');
  });

}

export function start(cb) {
  if (!initialized) init();

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
    return new Promise((resolve) => {
      if (config.sockets && config.sockets.server) {
        return config.sockets.server.listen(port, () => resolve());
      }

      app.listen(port, () => resolve());
    });
  }
}

var useBefore = app.useBefore = useAround('before.');
var useAfter = app.useAfter = useAround('after.');

function useAround(prefix) {
  return function(method, name, handler) {
    var eventName = prefix + method;

    if (typeof name === 'function') throw new Error(`No name provided: useAround('${eventName}')`);
    app.on(`${eventName}`, function(data) {
      wrap(name, function() {
        handler(data);
      });
    });
  };
}

export function use(modules) {
  if (!Array.isArray(modules)) modules = [ modules ];

  modules.map((module) => {
    app.on(module.event, module.handler);
  });
}

export default { app, start, init, wrap, use, useAfter, useBefore, Router: expRouter };

export { init, start, wrap, app, use, useAfter, useBefore, expRouter as Router };
