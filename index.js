/**
 * Native components
 */
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.start = start;
exports.use = use;
exports.configure = configure;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

/**
 * Module Dependencies
 */

var _compression = require('compression');

var _compression2 = _interopRequireDefault(_compression);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _methodOverride = require('method-override');

var _methodOverride2 = _interopRequireDefault(_methodOverride);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

/**
 * Local Dependencies
 */

var _plugins = require('./plugins');

var _plugins2 = _interopRequireDefault(_plugins);

var _pluginsPlugin = require('./plugins/plugin');

var _pluginsPlugin2 = _interopRequireDefault(_pluginsPlugin);

/**
 * Local Constants
 */
var app = (0, _express2['default'])();
var debug = (0, _debug2['default'])('jack-stack');
var dir = __dirname;

/**
 * This config object will be overridable during the `config` event
 */
var config = {
  cookie: {
    secret: 'You put the lime in the coconut'
  },
  session: {
    name: 'sessionID',
    secret: 'What would the fox say if he knew...?',
    getStore: function getStore() {
      console.warn('\n\n\nExpress MemoryStore should not be used in production...\n\n\n');
    }
  },
  experiments: ['placeholderExperiment'],
  bodyParser: {
    urlencoded: {
      extended: false
    }
  },
  morgan: 'dev',
  dirnames: {
    'static': [_path2['default'].join(process.cwd(), 'public')],
    routes: [_path2['default'].join(process.cwd(), 'routes')]
  },
  port: 5000,
  assign: function assign(newConfig) {
    Object.assign(config, newConfig);
  }
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
  var eventData = {
    name: name,
    app: app,
    config: config
  };

  app.emit('before', eventData);
  app.emit('before.' + name, eventData);
  console.info(initOrder++ + ': ' + name);

  /**
   * Call the handler. If a promise is returned,
   * delay startup until it is resolved
   */
  if (fn) registerDelay(fn());

  app.emit('after.' + name, eventData);
  app.emit('after', eventData);
}

function init() {

  initialized = true;

  _plugins2['default'].initialize();

  app.emit('config', config);

  wrap('config');

  // Fake PUT and DELETE when clients don't support
  wrap('override', function () {
    debug('override');
    app.use((0, _methodOverride2['default'])(config.methodOverride));
  });

  // GZip all of our responses
  wrap('compress', function () {
    debug('compress');
    app.use((0, _compression2['default'])(config.compression));
  });

  wrap('stack-end');
}

function start(cb) {
  if (!initialized) init();

  return _bluebird2['default'].all(delays).then(appListen.bind(app, config.port)).then(function () {
    if (cb) cb();
  })['catch'](function (err) {
    console.error(err);
    if (cb) cb(err);

    throw err;
  });

  function appListen(port) {
    return new _bluebird2['default'](function (resolve) {
      if (config.sockets && config.sockets.server) {
        return config.sockets.server.listen(port, function () {
          return resolve();
        });
      }

      app.listen(port, function () {
        return resolve();
      });
    });
  }
}

var useBefore = app.useBefore = useAround('before.');
var useAfter = app.useAfter = useAround('after.');

function useAround(prefix) {
  return function (method, name, handler) {
    var eventName = prefix + method;

    if (typeof name === 'function' || !name) throw new Error('No name provided: useAround(\'' + eventName + '\')');
    app.on('' + eventName, function (data) {
      wrap(name, function () {
        return handler(data);
      });
    });
  };
}

function use(modules) {
  if (!Array.isArray(modules)) modules = [modules];

  modules.map(function (module) {
    app.on(module.event, module.handler);
  });
}

function configure(name, handler, optional) {
  useBefore(name, name + ':configure', function () {
    var plugin = _plugins2['default'].get(name);

    if (typeof handler === 'object') {
      var _config = handler;
      handler = function (config, configure) {
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

_plugins2['default'].load();

exports['default'] = { app: app, dir: dir, init: init, Plugin: _pluginsPlugin2['default'], plugins: _plugins2['default'], Router: _express.Router, start: start, use: use, useAfter: useAfter, useBefore: useBefore, wrap: wrap };
exports.init = init;
exports.start = start;
exports.wrap = wrap;
exports.app = app;
exports.dir = dir;
exports.useAfter = useAfter;
exports.useBefore = useBefore;
exports.Router = _express.Router;
exports.Plugin = _pluginsPlugin2['default'];
exports.plugins = _plugins2['default'];
