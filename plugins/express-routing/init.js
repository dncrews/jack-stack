/**
 * Intializer function
 */
import jack from '../../';
import glob from 'glob';
import path from 'path';
import debugLib from 'debug';
import express from 'express';


const debug = debugLib('jack-stack:router');
const routerMatch = express.Router();

module.exports = function() {
  var config = this.config;

  jack.useBefore('stack-end', 'router', (data) => {
    let app = data.app;
    let dirs = config.dirnames;

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
  });
};
