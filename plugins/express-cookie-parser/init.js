/**
 * Intializer function
 */
import jack from '../../';
import cookieParser from 'cookie-parser';

export default function() {
  var config = this.config;

  let name = 'cookie';
  let handler = (data) => {
    let secret = data.config.cookie.secret || this.config.secret;

    // Configure Olympus, the stack, or the app here
    let app = data.app;

    app.use(cookieParser(secret));
  };

  if (config.useAfter) return jack.useAfter(config.useAfter, name, handler);
  if (config.useBefore) return jack.useBefore(config.useBefore, name, handler);

  return jack.useAfter('config', name, handler);
}
