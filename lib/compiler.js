'use strict';
var fork = require('child_process').fork;
var path = require('path');
var os = require('os');
var fs = require('fs');
var Promise = require('es6-promises');
var cwd = process.cwd();

/**
 * @param {String} src file containing es6 code.
 * @param {String} dest where to save the resulting es5 code.
 * @param {Object} options traceur config options.
 * @return {Promise}.
 */
exports.compile = function(src, dest, options) {
  // import lazzily as traceur pollutes the global namespace.
  var traceur = require('traceur');
  src = path.join(cwd, src);
  dest = path.join(cwd, dest);
  var rootSource = {
    name: src,
    type: options.script ? 'script' : 'module'
  };
  var includeRuntime = options.includeRuntime;
  delete options.includeRuntime;
  traceur.options.setFromObject(options);
  traceur.System.baseURL = cwd;
  return traceur.recursiveModuleCompileToSingleFile(dest, [rootSource], traceur.options)
    .then(function () {
      if (includeRuntime) {
        var content = fs.readFileSync(traceur.RUNTIME_PATH) + fs.readFileSync(dest);
        fs.writeFileSync(dest, content);
      }
    });
};

/**
*/
exports.server = function() {

  var server;
  var msgId = 0;
  var listeners = {};

  function spawnServer() {
    server = fork(__dirname + '/server.js');
    server.on('message', onMessage);
    server.on('error', function(err) {
      console.error('server error: ' + err);
    });
  }

  function onMessage(msg) {
    var listener = listeners[msg.id];
    if (listener) {
      delete listeners[msg.id];
      listener(msg);
    }
  }

  var api = {};

  /**
   * @param {String} src file containing es6 code.
   * @param {String} dest where to save the resulting es5 code.
   * @param {Object} options traceur config options.
   * @return {Promise}.
  */
  api.compile = function (src, dest, options) {
    return new Promise(function (resolve, reject) {
      var id = msgId++;
      listeners[id] = function(msg) {
        if (msg.error) {
          reject(msg.error);
        } else {
          resolve(msg.result);
        }
      };
      server.send({
        src: src,
        dest: dest,
        options: options,
        id: id
      });
    });
  };

  /**
   * stop the server
   */
  api.stop = function() {
    server.disconnect();
  };

  spawnServer();
  return api;
};
