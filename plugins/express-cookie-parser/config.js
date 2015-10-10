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
var config = {
  secret: 'You put the lime in the coconut',
};

export default config;

module.exports = config;
