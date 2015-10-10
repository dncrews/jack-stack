
import path from 'path';
import glob from 'glob';

const reservedWords = [ 'all' ];

var registered = {};
var enabled = [];
var dependencies = { all: []};
var initialized = false;


exports.add = add;
exports.disable = disable;
exports.enable = enable;
exports.get = get;
exports.initialize = initialize;
exports.load = loadBuiltinsNew


// loadBuiltinsNew();


/**
 * Adds and enables a new plugin
 * @param {Object} plugin  New Olympus Plugin
 *
 * @example
 * add({
 *   name: 'db/elasticbeanstalk',
 *   init: function(olympus, stack) {},
 *   deps: [ 'auth/redis', 'whatever', ]
 * });
 */
function add(plugin) {
  var name = plugin.name
    , init = plugin.init.bind(plugin)
    , deps = plugin.dependencies || []
    , enabled = plugin.enabled;

  /**
   * Validate that it's good enough
   */
  if (!name) throw new Error('Invalid plugin: plugin name not defined');
  if (!init) throw new Error('Invalid plugin: plugin initializer not defined: ' + name);

  /**
   * Make sure it doesn't conflict
   */
  if (registered[ name ]) throw new Error('Invalid: Duplicate plugin definition: ' + name);
  if (~reservedWords.indexOf(name)) throw new Error('Invalid plugin: plugin name reserved: ' + name);

  /**
   * Register it
   */
  dependencies[ name ] = deps;
  dependencies.all = dependencies.all.concat(deps);

  registered[ name ] = plugin;

  /**
   * All plugins should be enabled unless explicitly set to `false`.
   * I don't know of a valid use-case for this, but maybe one will come up...
   */
  if (enabled !== false) enable(name);
}


/**
 * Turn a Plugin "off"
 *
 * @param  {String} name  Plugin name
 */
function disable(name) {
  if (isFalsey(name)) return enable(name.slice(1));

  var idx = enabled.indexOf(name);

  if (~idx) enabled.splice(idx, 1);
}


/**
 * Turn a Plugin "on"
 *
 * @param  {String} name  Plugin name
 */
function enable(name) {
  if (typeof name === 'object') return add(name);

  if (isFalsey(name)) return disable(name.slice(1));

  if (!registered[ name ]) {
    console.warn('Unknown Plugin: ' + name);
    return;
  }

  if (!~enabled.indexOf(name)) enabled.push(name);
}


/**
 * Get a plugin by name
 * @return {Plugin}
 */
function get(name) {
  return registered[ name ];
}


/**
 * Instantiate all of the enabled plugins
 */
function initialize() {
  enabled.sort(pluginSorter);
  dependencies.all.map((dep) => {
    if (!~enabled.indexOf(dep)) throw new Error('Unfulfilled dependency: ' + dep);
  });

  if (initialized) return;

  initialized = true;

  enabled.forEach((name) => {
    registered[ name ].init();
  });

}


/**
 * Check to see if the given name is "Falsey"
 *
 * "Falsey" currently means: "begins with a !"
 *
 * @param  {String}  name Name to Check
 * @return {Boolean}
 */
function isFalsey(name) {
  return name.charAt(0) === '!';
}


/**
 * Pre-load all built-in plugins for initialization
 */
// function loadBuiltins() {
//   let builtins = path.join(__dirname, '*', '**', 'index.js');

//   glob.sync(path.join(builtins)).map((filename) => {
//     var defaultName = filename
//       .replace(__dirname, '')
//       .replace(/index\.js$/, '')
//       .replace(/^\//, '')
//       .replace(/\/$/, '');

//     var plugin = require(filename)
//       , enabled = plugin.enabled
//       , handler = plugin.handler
//       , deps = plugin.dependencies || []
//       , name = plugin.name || defaultName;

//     dependencies[ name ] = deps;
//     dependencies.all = dependencies.all.concat(deps);

//     registered[ name ] = handler;

//     if (enabled) enable(name);
//   });
// }


function loadBuiltinsNew() {
  let builtins = path.join(__dirname, '*', '**', 'index.js');

  glob.sync(path.join(builtins)).map((filename) => {
    add(require(filename));
  });
}


/**
 * Array sorter for Plugins
 *
 * This sorter makes sure that all dependencies are loaded
 * before the libraries that depend on them.
 */
function pluginSorter(a, b) {
  function send(n) {
    // Uncomment to log
    // console.info(a + '<=>' + b + ' = ' + n);
    return n;
  }

  var aIn = dependencies.all.indexOf(a);
  var bIn = dependencies.all.indexOf(b);

  // If they're both clean, I don't care
  if (aIn === bIn === -1) return send(0);

  // If either depends on the other, sort that crap
  if (~dependencies[ a ].indexOf(b)) return send(1);
  if (~dependencies[ b ].indexOf(a)) return send(-1);

  // If one of them is depended on, but not the other, sort that crap
  if (~aIn && !~bIn) return send(-1);
  if (!~aIn && ~bIn) return send(1);

  // Both required, but not by each other
  return send(0);
}
