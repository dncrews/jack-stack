# Jack-Stack
A Jack-of-Express-stack, master of nothing else.

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
This library was written using ES6 (ES 2015), but can still be used by ES5.


### ES6

```js
// Import jack's parts
import { app, init, start } from 'jack-stack';

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
var jack = require('jack-stack/es5');

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
import app, { start } from 'jack-stack';

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
If you want to add your own middleware during the initialization stage of the app, you can use the `before` and `after` events.

```js
import { app, init, start } from 'jack-stack';

app.on('before.init.routing', function() {
  app.get('/', function(req, res, next) {
    // Something here before the core routing happens
  });
});
```

### Current events
`before.init.`
`after.init.`
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



## Contribution
We'd love you to contribute. To work on it locally, simply clone the repo and use babel to generate the es5 stuff:

```bash
$ npm install -g babel
$ git clone https://github.com/dncrews/jack-stack.git .
$ cd jack-stack
$ babel index.js --watch --out-file es5.js
```
