
import path from 'path';

/**
 * Olympus Plugins
 *
 * @param {Object} data  New Plugin Configuration
 * @example
 * new OlympusPlugin({
 *   name: 'PluginName',
 *   deps: [ 'array', 'of', 'other', 'dependencies' ],
 *   basePath: __dirname,
 * });
 */
export default class OlympusPlugin {

  constructor(data) {
    if (!data.name) throw new Error('Plugin must be named');
    let config;

    this.name = data.name;
    this.deps = data.deps;

    let basePath = data.basePath;

    this._initializer = require(path.join(basePath, 'init'));

    try {
      config = require(path.join(basePath, 'config'));
    } catch (e) {
      config = {};
    }

    this.config = config;
    this.configure = this.configure.bind(this);

    return this;
  }

  /**
   * Configuration extension
   * @param  {Object}        overrides  Configuration Overrides
   * @return {OlympusPlugin}            `this`
   */
  configure(overrides) {
    if (overrides === void 0) return this;

    Object.assign(this.config, overrides);

    return this;
  }

  /**
   * This method is separated so that you can disable
   * a plugin on the fly as needed.
   */
  init() {
    if (this.config.disable || this.config.disabled) return;

    return this._initializer();
  }

}
