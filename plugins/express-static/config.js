/**
 * Set your defaults here.
 *
 * Also put in any `node-config` pulls.
 * If you do use node-config, npm install it yourself
 */
import path from 'path';

module.exports = {
  dirnames: [ path.join(process.cwd(), 'public') ],
  useAfter: 'config',
};
