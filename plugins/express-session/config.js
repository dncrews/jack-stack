/**
 * Set your defaults here.
 *
 * Also put in any `node-config` pulls.
 * If you do use node-config, npm install it yourself
 */

// Some examples
// var configLib = require('config');
// var config = {};
// if (configLib.has('somekey')) config = configLib.get('somekey');

module.exports = {
  name: 'sessionID',
  secret: 'What would the fox say if he knew...?',
  getStore: () => {
    console.warn('\n\n\nExpress MemoryStore should not be used in production...\n\n\n');
  },

  useAfter: 'cookie',
};
