/**
 * Intializer function
 */
import jack from '../../';
import express from 'express';

export default function() {
  var config = this.config;

  var name = 'static';
  var handler = (data) => {
    let app = data.app;

    var dirs = config.dirnames;

    if (!Array.isArray(dirs)) dirs = [ dirs ];

    dirs.map((dir) => {
      app.use(express.static(dir));
    });
  };

  if (config.useAfter) return jack.useAfter(config.useAfter, name, handler);
  if (config.useBefore) return jack.useBefore(config.useBefore, name, handler);
}
