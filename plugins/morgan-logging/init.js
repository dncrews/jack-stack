/**
 * Intializer function
 */
import jack from '../../';
import morgan from 'morgan';

export default function() {
  var config = this.config;

  var name = 'logging:morgan';
  var handler = (data) => {
    let app = data.app;

    app.use(morgan(config.init));
  };

  if (config.useAfter) return jack.useAfter(config.useAfter, name, handler);
  if (config.useBefore) return jack.useBefore(config.useBefore, name, handler);
}
