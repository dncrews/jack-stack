# Jack-Stack
<!-- [![Build Status][build-image]][build-url] -->
[![NPM version][npm-image]][npm-url]
[![Downloads][downloads-image]][downloads-url]
[![Tips][gratipay-image]][gratipay-url]

A Jack-of-Express-stack; master of nothing else.

## Purpose
Jack-Stack handles all of the standard [Express.js](http://expressjs.com/) app configuration you don't really care about.

### What it provides
(In the following order)

1. [express.static](http://expressjs.com/starter/static-files.html)
1. [morgan](https://github.com/expressjs/morgan)
1. [cookie-parser](https://github.com/expressjs/cookie-parser)
1. [express-session](https://github.com/expressjs/session)
1. [feature-client](https://github.com/XPRMNTL/feature-client.js)
1. [xpr-express](https://github.com/XPRMNTL/xpr-express.js)
1. [xpr-toggle](https://github.com/XPRMNTL/xpr-toggle.js)
1. [body-parser](https://github.com/expressjs/body-parser)
  1. json and urlencoded
1. [method-override](https://github.com/expressjs/method-override)
1. [compression](https://github.com/expressjs/compression)


## Installation
```bash
$ npm install --save jack-stack
```

## Usage
This library was written using ES6 (ES 2015), but it is compiled to ES5.1, and uses that by default.


### ES6

```js
// Import jack's parts
import { app, init, start } from 'jack-stack/es6';

// Configure your app
app.get('/', (req, res, next) => {
  // Whatever you want
});

// Start your app
start(() => {
  console.log('listening');
});
```


### ES5
```js
// Require Jack's ES5 library
var jack = require('jack-stack');

// Set the parts
var app = jack.app;
var init = jack.init;
var start = jack.start;

// Configure your app
app.get('/', function(req, res, next) {
  // whatever you want
});

// Start your app
start(function() {
  console.log('listening');
});
```

## Configuration
Jack lets you know when it's ready for you to pass in configuration. You can either overwrite specific keys, or you can pass a full object to merge with `config`;

```js
import app, { start } from 'jack-stack/es6';

// You can use either
// app.on('config')
// jack.useAfter('config')

app.on('config', function(config) {
  // Here you can do something with the config:
  config.key = 'value';

  // Or you can pass in a full object to get merged with the default
  config.merge({
    key1: 'value1',
    key2: 'value2',
  });
});

start();
```

### Configuration options

```js
{
  experiments: [
    {
      name: 'expName', // Experiment name
      default: false, // Default value
    }
  ],
  cookie: {
    secret: '', // Your Express cookie secret
  },
  session: {
    name: '', // The name of your express session
    secret: '', // The express session secret
    getStore: (expressSession) => {
      // Function for using your own Session storage.
      // By default uses Express MemoryStore, which is not production-ready
    }
  },
  bodyParser: {
    urlencoded: {
      // any configuration to pass into bodyParser.urlencoded
      extended: false,
    },
    json: {}, // any configuration to pass into bodyParser.json
  },
  methodOverride: {}, // any configuration to pass into methodOverride
  morgan: {}, // any configuration to pass into morgan
  staticDir: '', // Path to your webroot. Defaults to './public'
  port: 5000, // Port to run your application. Defaults to 5000
}
```

## Middleware Ordering
The easiest way to add your own middleware during any stage in the initialization is to use `jack.useBefore` and `jack.useAfter`.
These methods have the following signature:
```js
jack.useBefore(method, name, handler);
jack.useAfter(method, name, handler);
```
- `method` - This is the event you want to neighbor your new handler.
- `name` - A name for your handler. Make sure you check for uniqueness. I don't.
- `handler` - Function to call when your turn for intialization comes.
  - `handler` is called as: `handler({ app, config, registerDelay })`
    - `app` - This is the Express app
    - `config` - This is the full Jack configuration object (see config);
    - `registerDelay` - This allows you to register asynchronous actions that require delay of startup (see Async Middleware)
  - **jack.useAfter('config') is special. It only calls handler with the config object**

```js
import jack from 'jack-stack/es6';

jack.useBefore('routing', 'name:your:event', (data) => {
  var app = data.app;

  app.get('/', (req, res, next) => {
    // Something here before the core routing happens
  });
});

jack.useAfter('routing', 'sample:catchall', (data) => {
  var config = data.config;

  app.use((req, res, next) => {
    console.log('I hate 404, so...');
    res.sendStatus(config.preferredStatusCode);
  });
});
```

The manual equivalent of this is listening on the events and wrapping your own methods in their events:

**If you forget to wrap and name your events, you cannot stick things before or after your own things later.**
```js
import { app, init, start, wrap } from 'jack-stack/es6';

app.on('before.routing', () => {
  wrap('name:your:event', () => {
    app.get('/', (req, res, next) => {
      // Something here before the core routing happens
    });
  });
});

app.on('after.routing', () => {
  wrap('sample:catchall', (data) => {
    var config = data.config;

    app.use((req, res, next) => {
      console.log('I hate 404, so...');
      res.sendStatus(config.preferredStatusCode);
    });

    app.get('/', (req, res, next) => {
      // Something here before the core routing happens
    });
  });
});

```

### Async Middleware
The big problem with adding middleware asynchronously is that you need to register a middleware during your event or it'll get out of order. To solve this, we'll add our middleware, delay startup until after our middleware is configured, and then configure it.

We'll use the parameter that gets passed up with the event: `registerDelay`, which accepts Promises;

#### ES6
```js
import jack, { start } from 'jack-stack/es6';

jack.useAfter('session', (data) => {
  var registerDelay = data.registerDelay;

  // Prep your async stuff
  var _promise = new Promise((resolve, reject) => {
    return request.get('/something')
      .then((res) => {

        // Configure your actual middleware asynchronously
        resolve((req, res, next) => {
          // Something here using your response
        });
      })
      .catch(reject);
  });

  // Register the endpoint here, synchronously
  app.get('/login', (req, res, next) => {

    // Call the middleware you define [in your promise] here
    return _promise.then(middleware => middleware(req, res, next));
  });

  // Let me know you want to delay startup to avoid server hand-off
  registerDelay(_promise);
});

start();
```

#### ES5
```js
var Promise = require('bluebird');
var jack = require('jack-stack');
var app = jack.app
  , start = jack.start;

jack.useAfter('session', function(data) {
  var registerDelay = data.registerDelay;

  // Prep your async stuff
  var _promise = new Promise(function(resolve, reject) {
    return request.get('/something')
      .then(function(res) {

        // Configure your actual middleware asynchronously
        resolve(function(req, res, next) {
          // Something here using your response
        });
      })
      .catch(reject);
  });

  // Register the endpoint here, synchronously
  app.get('/login', function(req, res, next) {

    // Call the middleware you define [in your promise] here
    return _promise.then(function(middleware) {
      middleware(req, res, next)
    });
  });

  // Let me know you want to delay startup to avoid server hand-off
  registerDelay(_promise);
});

start();
```


### Currently Built-in events you may wrap around:
- `static` - express.static
- `logging` - morgan
- `cookie` - cookie-parser
- `session` - express-session
- `xprmntl` - feature-client
- `json` - body-parser.json
- `urlencoded` - body-parser.urlencoded
- `override` - method-override
- `compress` - compression
- `routing` - Express router


### Custom Events
You can also use these events for your own middleware if you'd like. Simply use the exported `wrap` method for wrapping your own middleware:

#### ES6
First place:
```js
import { app, wrap } from 'jack-stack/es6';

wrap('nameOfThis', () => {
  app.use(someMiddleware());
});
```

Elsewhere:
```js
jack.useBefore('nameOfThis', 'nameOfNewThing', () => {
  app.use(somethingBeforeThat());
});
```

#### ES5
First place:
```js
var jack = require('jack-stack');

var app = jack.app
  , wrap = jack.wrap;

wrap('nameOfThis', function() {
  app.use(someMiddleware());
});
```

Elsewhere:
```js
jack.useBefore('nameOfThis', 'nameOfNewthing', function() {
  app.use(somethingBeforeThat());
});
```

### Plugins


#### Known Plugins
- [jack-stack-redis](https://github.com/dncrews/jack-stack-redis) - Connect-Redis RedisStore session storage to replace the built-in MemoryStore one, which is "no bueno" for production.
- [Your Plugin Here] - Please feel free to create your own. If you do and you'd like to have it listed here, please create me a Pull Request adding it. I appreciate your contributions!

#### Plugin Authoring
Plugin authoring is handled in the same way events are. Any initialized plugin should return the following structure (or an array of them):

```js
{
  event: 'name.of.event',
  handler: function() {
    // handler stuff
  }
}
```

You can then use `jack.use` to implement these plugins:
```js
var jack = require('jack-stack');
var start = jack.start;
var redisConfig = {
  host: 'localhost',
  port: 6379
};

var redisPlugin = require('jack-stack-redis')(redisConfig);
// This returns
// {
//   event: 'config',
//   handler: function(config) {
//     config.session.getStore = () => {
//       return new RedisStore(redisConfig);
//     };
//   }
// }
jack.use(redisPlugin);
```



## Contribution
We'd love you to contribute. To work on it locally, simply clone the repo and use babel to generate the es5 stuff:

```bash
$ npm install -g babel
$ git clone https://github.com/dncrews/jack-stack.git .
$ cd jack-stack
$ babel es6.js --watch --out-file index.js
```

[build-image]: https://travis-ci.org/dncrews/jack-stack.svg?branch=master
[build-url]: https://travis-ci.org/dncrews/jack-stack
[npm-image]: https://img.shields.io/npm/v/jack-stack.svg
[npm-url]: https://www.npmjs.org/package/jack-stack
[downloads-image]: https://img.shields.io/npm/dm/jack-stack.svg
[downloads-url]: https://www.npmjs.org/package/jack-stack
[gratipay-image]: https://img.shields.io/gratipay/dncrews.svg
[gratipay-url]: https://www.gratipay.com/dncrews/
