/*
* grunt-traceur
* https://github.com/aaronfrost/grunt
*
* Copyright (c) 2013 Aaron Frost
* Licensed under the MIT license.
*/

'use strict';
var fs = require('fs');
var Promise = require('es6-promises');
var traceur = require('traceur');
var compiler = require('../lib/compiler');

/**
 * initialization of variables used in inner scopes
 */
var options, compile, success;

/**
 * logger interface
 */
var logger = {
  ok: undefined,
  debug: undefined,
  error: undefined
};

/**
 * executes after file compilation succeeded
 */
var onCompileSuccess = function (src, dest) {
  logger.debug('Compiled successfully to "' + dest + '"');
  logger.ok(src + ' -> ' + dest);
};

/**
 * executes after file compilation failed
 */
var onCompileError = function (src, dest, err) {
  logger.error(src + ' -> ' + dest);
  logger.error(err);
  success = false;
};

/**
 * validates group and returns compile promise (or throws if not valid)
 */
var getCompilePromise = function (group) {
  if (group.src.length > 1) {
    throw new Error('source MUST be a single file OR multiple files using expand:true. ' +
      'Check out the README.');
  }
  var src = group.src[0];
  var dest = group.dest;
  return compile(src, dest, options)
    .then(onCompileSuccess.bind(null, src, dest))
    .catch(onCompileError.bind(null, src, dest));
};

var traceurTask = function () {
  var server;
  var done = this.async();
  options = this.options();
  logger.debug('using options: ' + JSON.stringify(options));
  if (options.spawn) {
    server = compiler.server();
    compile = server.compile;
  } else {
    compile = compiler.compile;
  }
  delete options.spawn;
  success = true;
  Promise
    .all(this.files.map(getCompilePromise))
    .then(function () {
      if (server) {
        server.stop();
      }
      done(success);
    });
};

module.exports = function(grunt) {
  logger = grunt.log;
  grunt.registerMultiTask('traceur',
    'Compile ES6 JavaScript to ES5 JavaScript', traceurTask);
};
