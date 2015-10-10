/**
 * Native components
 */
import path from 'path';

/**
 * Module Dependencies
 */
import compress from 'compression';
import debugLib from 'debug';
import express, { Router as expRouter } from 'express';
import methodOverride from 'method-override';
import Promise from 'bluebird';

/**
 * Local Dependencies
 */
import plugins from './plugins';
import Plugin from './plugins/plugin';

/**
 * Local Constants
 */
const app = express();
const debug = debugLib('jack-stack');
var dir = __dirname;

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
    name,
    app,
    config,
  };

  app.emit('before', eventData);
  app.emit(`before.${name}`, eventData);
  console.info(`${initOrder++}: ${name}`);

  /**
   * Call the handler. If a promise is returned,
   * delay startup until it is resolved
   */
  if (fn) registerDelay(fn());

  app.emit(`after.${name}`, eventData);
  app.emit('after', eventData);
}

function init() {

  initialized = true;

  plugins.initialize();

  app.emit('config', config);

  wrap('config');

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

  wrap('stack-end');
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

    if (typeof name === 'function' || !name) throw new Error(`No name provided: useAround('${eventName}')`);
    app.on(`${eventName}`, function(data) {
      wrap(name, function() {
        return handler(data);
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

export function configure(name, handler, optional) {
  useBefore(name, `${name}:configure`, function() {
    let plugin = plugins.get(name);

    if (typeof handler === 'object') {
      var _config = handler;
      handler = function(config, configure) {
        configure(_config);
      };
    }

    // Only the `optional` flag allows this to fail silently
    if (!plugin && optional) return;

    /**
     * Allow apps to configure plugins
     * If they return a Promise, also delay startup
     */
    return handler(plugin.config, plugin.configure);
  });
}

function registerDelay(promise) {
  if (!promise || typeof promise.then !== 'function') return;
  delays.push(promise);
}

plugins.load();

export default { app, dir, init, Plugin, plugins, Router: expRouter, start, use, useAfter, useBefore, wrap, };

export { init, start, wrap, app, dir, useAfter, useBefore, expRouter as Router, Plugin, plugins };
