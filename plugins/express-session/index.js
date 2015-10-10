
import Plugin from '../plugin';

export default new Plugin({
  // Name your plugin. Don't put `olympus` in the title, as that's assumed
  name: 'session',
  basePath: __dirname,
  deps: [ 'cookie' ],
});
