'use strict';

var path = require('path');
var async = require('async');
var toDest = require('./lib/dest');
var invalid = require('./lib/invalid');
var utils = require('./lib/utils');
var base = require('./lib/base');

/**
 * Copy a filepath, vinyl file, array of files, or glob of files to the
 * given destination `directory`, with `options` and callback function that
 * exposes `err` and the array of vinyl files that are created by the copy
 * operation.
 *
 * ```js
 * copy('*.js', 'dist', function(err, file) {
 *   // exposes the vinyl `file` created when the file is copied
 * });
 * ```
 * @param {String|Object|Array} `patterns` Filepath(s), vinyl file(s) or glob of files.
 * @param {String} `dir` Destination directory
 * @param {Object|Function} `options` or callback function
 * @param {Function} `cb` Callback function if no options are specified
 * @api public
 */

function copy(patterns, dir, options, cb) {
  if (arguments.length < 3) {
    return invalid.apply(null, arguments);
  }

  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  var opts = utils.extend({cwd: process.cwd()}, options);
  opts.cwd = path.resolve(opts.cwd);
  patterns = utils.arrayify(patterns);

  if (!utils.hasGlob(patterns)) {
    copyEach(patterns, dir, opts, cb);
    return;
  }

  opts.patterns = patterns;
  if (!opts.srcBase) {
    opts.srcBase = path.resolve(opts.cwd, utils.parent(patterns));
  }

  utils.glob(patterns, opts, function(err, files) {
    if (err) return cb(err);
    copyEach(files, dir, opts, cb);
  });
}

/**
 * Copy an array of files to the given destination `directory`, with
 * `options` and callback function that exposes `err` and the array of
 * vinyl files that are created by the copy operation.
 *
 * ```js
 * copy.each(['foo.txt', 'bar.txt', 'baz.txt'], 'dist', function(err, files) {
 *   // exposes the vinyl `files` created when the files are copied
 * });
 * ```
 * @name .copy.each
 * @param {Array} `files` Filepaths or vinyl files.
 * @param {String} `dir` Destination directory
 * @param {Object|Function} `options` or callback function
 * @param {Function} `cb` Callback function if no options are specified
 * @api public
 */

function copyEach(files, dir, options, cb) {
  if (arguments.length < 3) {
    return invalid.apply(null, arguments);
  }

  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  var opts = utils.extend({}, options);
  if (typeof opts.cwd === 'undefined') {
    opts.cwd = process.cwd();
  }

  if (!opts.srcBase && opts.patterns) {
    opts.srcBase = path.resolve(opts.cwd, utils.parent(opts.patterns));
  }

  async.reduce(files, [], function(acc, filepath, next) {
    filepath = path.resolve(opts.cwd, filepath);
    copyOne(filepath, dir, opts, function(err, file) {
      if (err) return next(err);
      next(null, acc.concat(file));
    });
  }, cb);
}

/**
 * Copy a single `file` to the given `dest` directory, using
 * the specified options and callback function.
 *
 * ```js
 * copy.one('foo.txt', 'dist', function(err, file) {
 *   if (err) throw err;
 *   // exposes the vinyl `file` that is created when the file is copied
 * });
 * ```
 * @name .copy.one
 * @param {String|Object} `file` Filepath or vinyl file
 * @param {String} `dir` Destination directory
 * @param {Object|Function} `options` or callback function
 * @param {Function} `cb` Callback function if no options are specified
 * @api public
 */

function copyOne(file, dir, options, cb) {
  if (arguments.length < 3) {
    return invalid.apply(null, arguments);
  }

  if (typeof options === 'function') {
    cb = options;
    options = {};
  }

  var opts = utils.extend({}, options);
  if (typeof opts.cwd === 'undefined') {
    opts.cwd = process.cwd();
  }
  if (typeof file === 'string') {
    file = path.resolve(opts.cwd, file);
  }

  if (!opts.srcBase && opts.patterns) {
    opts.srcBase = path.resolve(opts.cwd, utils.parent(opts.patterns));
  }

  toDest(dir, file, opts, function(err, out) {
    if (err) return cb(err);

    base(file, out.path, opts, function(err) {
      if (err) return cb(err);
      cb(null, out);
    });
  });
}

/**
 * Expose `copy`
 */

module.exports = copy;
module.exports.one = copyOne;
module.exports.each = copyEach;
