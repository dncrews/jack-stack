'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.start = start;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * Native components
 */

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

/**
 * Module Dependencies
 */

var _bodyParser = require('body-parser');

var _bodyParser2 = _interopRequireDefault(_bodyParser);

var _compression = require('compression');

var _compression2 = _interopRequireDefault(_compression);

var _cookieParser = require('cookie-parser');

var _cookieParser2 = _interopRequireDefault(_cookieParser);

var _express = require('express');

var _express2 = _interopRequireDefault(_express);

var _expressSession = require('express-session');

var _expressSession2 = _interopRequireDefault(_expressSession);

var _methodOverride = require('method-override');

var _methodOverride2 = _interopRequireDefault(_methodOverride);

var _morgan = require('morgan');

var _morgan2 = _interopRequireDefault(_morgan);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _featureClient = require('feature-client');

var _featureClient2 = _interopRequireDefault(_featureClient);

var _xprExpress = require('xpr-express');

var _xprExpress2 = _interopRequireDefault(_xprExpress);

var _xprToggle = require('xpr-toggle');

var _xprToggle2 = _interopRequireDefault(_xprToggle);

require('babel').transform('code', { optional: ['runtime'] });

/**
 * Local Dependencies
 */

/**
 * Local Constants
 */
var app = (0, _express2['default'])();

/**
 * This config object will be overridable during the `config` event
 */
var config = {
  cookie: {
    secret: 'You put the lime in the coconut' },
  session: {
    name: 'sessionID',
    secret: 'What would the fox say if he knew...?',
    getStore: function getStore(expressSession) {
      console.warn('\n\n\nExpress MemoryStore should not be used in production...\n\n\n');
    }
  },
  bodyParser: {
    urlencoded: {
      extended: false }
  },
  morgan: 'dev',
  staticDir: _path2['default'].join(process.cwd(), 'public'),
  port: 5000,
  assign: function assign(newConfig) {
    Object.assign(config, newConfig);
  } };

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
  app.emit('before.init.' + name, registerDelay);
  fn();
  app.emit('after.init.' + name, registerDelay);

  function registerDelay(promise) {
    if (typeof promise.next !== 'function') return;
    delays.push(promise);
  }
}

function init() {

  initialized = true;

  app.emit('config', config);

  // Load static assets
  wrapEvents('static', function () {
    app.use(_express2['default']['static'](config.staticDir));
  });

  // Log everything after this
  wrapEvents('logging', function () {
    app.use((0, _morgan2['default'])(config.morgan));
  });

  // req.cookie
  wrapEvents('cookie', function () {
    app.use((0, _cookieParser2['default'])(config.cookie.secret));
  });

  // req.user
  wrapEvents('session', function () {
    var store = config.session.getStore(_expressSession2['default']);
    var sessionConfig = {
      key: config.session.name,
      secret: config.session.secret,
      resave: false,
      saveUninitialized: false };

    if (store) sessionConfig.store = store;

    app.use((0, _expressSession2['default'])(sessionConfig));
  });

  // Req.feature
  wrapEvents('xprmntl', function () {
    var xprConfig = config.experiments;

    experimented = !!xprConfig;

    if (!experimented) return;
    if (Array.isArray(xprConfig)) xprConfig = { experiments: xprConfig };

    _featureClient2['default'].use((0, _xprExpress2['default'])());
    _featureClient2['default'].use((0, _xprToggle2['default'])());
    _featureClient2['default'].configure(xprConfig);

    app.use(_featureClient2['default'].express);
    app.use(_featureClient2['default'].toggle);

    delays.push(_featureClient2['default'].announce()['catch'](function () {
      // If there's no XPRMNTL Dashboard response,
      // I want to start the app anyway, just with the fallbacks
      return _bluebird2['default'].resolve();
    }));
  });

  // parse application/json
  wrapEvents('json', function () {
    app.use(_bodyParser2['default'].json(config.bodyParser.json));
  });

  // parse application/x-www-form-urlencoded
  wrapEvents('urlencoded', function () {
    app.use(_bodyParser2['default'].urlencoded(config.bodyParser.urlencoded));
  });

  // Fake PUT and DELETE when clients don't support
  wrapEvents('override', function () {
    app.use((0, _methodOverride2['default'])(config.methodOverride));
  });

  // GZip all of our responses
  wrapEvents('compress', function () {
    app.use((0, _compression2['default'])(config.compression));
  });

  // Any routing level stuff
  wrapEvents('routing', function () {});
}

function start(cb) {
  if (!initialized) init();

  return _bluebird2['default'].all(delays).then(appListen.bind(app, config.port)).then(function () {
    if (cb) cb();
  });

  function appListen(port) {
    return new _bluebird2['default'](function (resolve, reject) {
      app.listen(port, function () {
        return resolve();
      });
    });
  }
}

exports.init = init;
exports.start = start;
exports.wrap = wrapEvents;
exports.app = app;
exports['default'] = app;
