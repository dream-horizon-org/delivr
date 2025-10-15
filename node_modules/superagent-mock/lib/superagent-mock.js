"use strict";

/**
 * Installs the `mock` extension to superagent.
 * @param superagent Superagent instance
 * @param config The mock configuration
 * @param logger Logger callback
 */
module.exports = function (superagent, config, logger) {
  var Request = superagent.Request;
  var currentLog = {};
  var logEnabled = !!logger;
  /**
   * Keep the default methods
   */

  var oldEnd = Request.prototype.end;
  /**
   * Flush the current log in the logger method and reset it
   */

  function flushLog() {
    logger(currentLog);
    currentLog = {};
  }
  /**
   * Loop over the patterns and use @callback when the @query matches
   */


  var forEachPatternMatch = function () {
    var configLength = config.length;
    return function (query, callback) {
      for (var i = 0; i < configLength; i++) {
        if (new RegExp(config[i].pattern, 'g').test(query)) {
          callback(config[i]);
        }
      }
    };
  }();
  /**
   * Chains progress events and eventually returns the response
   * @param ProgressEvent (object/function) the ProgressEvent implementation
   * @param request (object) the current request
   *
   * @param progress (object) the progress configuration
   * @param progress.parts (number)
   * @param [progress.delay=0] (number)
   * @param [progress.total=100] (number)
   * @param [progress.lengthComputable=true] (boolean)
   * @param [progress.direction='upload'] (string)
   *
   * @param remainingParts (number) the remaining calls to make
   * @param callback (function) the end response callback
   */


  var handleProgress = function handleProgress(ProgressEvent, request, progress, remainingParts, callback) {
    setTimeout(function () {
      var total = progress.total || 100;
      var loaded = total * (progress.parts - remainingParts) / progress.parts;
      var lengthComputable = progress.lengthComputable !== false; // default is true

      var event = ProgressEvent.initProgressEvent ? ProgressEvent.initProgressEvent('', true, false, lengthComputable, loaded, total) // IE10+
      : new ProgressEvent('', {
        lengthComputable: lengthComputable,
        loaded: loaded,
        total: total
      });

      if (event.total > 0) {
        event.percent = event.loaded / event.total * 100;
      }

      event.direction = progress.direction || 'upload';
      request.emit('progress', event);

      if (remainingParts > 0) {
        handleProgress(ProgressEvent, request, progress, remainingParts - 1, callback);
      } else {
        callback();
      }
    }, progress.delay || 0);
  };
  /**
   * Override end function
   */


  Request.prototype.end = function (fn) {
    var error = null;
    var path;
    var isNodeServer = this.hasOwnProperty('cookies');
    var response = {};

    if (this._finalizeQueryString) {
      // superagent 3.6+
      var originalUrl = this.url;
      isNodeServer ? this.request() : this._finalizeQueryString(this);
      path = this.url;
      this.url = originalUrl;
    } else {
      // superagent < 3.6
      if (isNodeServer) {
        // node server
        var originalPath = this.path;
        this.path = this.url;

        this._appendQueryString(this); // use superagent implementation of adding the query


        path = this.path; // save the url together with the query

        this.path = originalPath; // reverse the addition of query to path by _appendQueryString
      } else {
        // client
        var _originalUrl = this.url;

        this._appendQueryString(this); // use superagent implementation of adding the query


        path = this.url; // save the url together with the query

        this.url = _originalUrl; // reverse the addition of query to url by _appendQueryString
      }
    } // Attempt to match path against the patterns in fixtures


    var parser = null;
    forEachPatternMatch(path, function (matched) {
      if (!parser) {
        parser = matched;
      } else if (logEnabled) {
        currentLog.warnings = (currentLog.warnings || []).concat(['This other pattern matches the query but was ignored: ' + matched.pattern]);
      }
    }); // For warning purpose: attempt to match url against the patterns in fixtures

    if (!parser && logEnabled) {
      forEachPatternMatch(this.url, function (matched) {
        currentLog.warnings = (currentLog.warnings || []).concat(['This pattern was ignored because it doesn\'t matches the query params: ' + matched.pattern]);
      });
    }

    if (logEnabled) {
      currentLog.matcher = parser && parser.pattern;
      currentLog.mocked = !!parser;
      currentLog.url = path;
      currentLog.method = this.method;
      currentLog.data = this._data;
      currentLog.headers = this.header;
      currentLog.timestamp = new Date().getTime();
    }

    if (!parser) {
      if (logEnabled) {
        flushLog();
      }

      return oldEnd.call(this, fn);
    }

    var match = new RegExp(parser.pattern, 'g').exec(path);
    var context = {};

    try {
      var method = this.method.toLocaleLowerCase();
      context.method = method;
      var fixtures = parser.fixtures(match, this._data, this.header, context);

      if (context.cancel === true) {
        if (logEnabled) {
          currentLog.mocked = false;
          currentLog.cancelled = true;
          flushLog();
        }

        return oldEnd.call(this, fn); // mocking was cancelled from within fixtures
      }

      if (logEnabled) {
        currentLog.fixtures = fixtures;
      }

      var parserMethod = parser[method] || parser.callback;
      response = parserMethod(match, fixtures);
    } catch (err) {
      error = err;
      response = new superagent.Response({
        res: {
          headers: {},
          setEncoding: function setEncoding() {},
          on: function on() {},
          body: err.responseBody || {}
        },
        req: {
          method: function method() {},
          path: path,
          url: path
        },
        xhr: {
          responseType: '',
          responseText: err.responseText || '',
          getAllResponseHeaders: function getAllResponseHeaders() {
            return 'a header';
          },
          getResponseHeader: function getResponseHeader() {
            return err.responseHeader || 'a header';
          }
        }
      });

      if (response._setStatusProperties) {
        // Error() forces its message to a string when a status must be a number
        response._setStatusProperties(Number(err.message));
      } else {
        response.setStatusProperties(Number(err.message));
      }
    } // Execute .ok() hook only if it exists and we have a status to check with


    if (this._okCallback && response.status) {
      try {
        if (this._isResponseOK(response)) {
          error = null;
        } else {
          error = new Error(response.statusText || 'Unsuccessful HTTP response');
        }
      } catch (custom_err) {
        error = custom_err; // ok() callback can throw
      }
    }

    if (logEnabled) {
      currentLog.error = error;
    } // Check if a callback for progress events was specified as part of the request


    var progressEventsUsed = isNodeServer ? !!this._formData : this.hasListeners && this.hasListeners('progress');

    if (context.progress && progressEventsUsed) {
      var ProgressEvent = global.ProgressEvent || function (type, rest) {
        // polyfill
        rest.type = type;
        return rest;
      }; // if no delay for parts was specified but an overall delay was, then divide the delay between the parts.


      if (!context.progress.delay && context.delay) {
        context.progress.delay = context.delay / context.progress.parts;
      }

      handleProgress(ProgressEvent, this, context.progress, context.progress.parts - 1, function () {
        if (logEnabled) {
          currentLog.progressEvent = true;
          flushLog();
        }

        fn(error, response);
      });
    } else if (context.delay) {
      setTimeout(function () {
        if (logEnabled) {
          flushLog();
        }

        fn(error, response);
      }, context.delay);
    } else {
      if (logEnabled) {
        flushLog();
      }

      fn(error, response);
    }

    return this;
  };

  return {
    unset: function unset() {
      Request.prototype.end = oldEnd;
    }
  };
};