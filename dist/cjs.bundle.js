'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var _$1 = require('underscore');

var methodMap = {
	create: 'POST',
	update: 'PUT',
	patch: 'PATCH',
	delete: 'DELETE',
	read: 'GET'
};

function sync(method, model, options) {
	var type = methodMap[method];
	// Default options, unless specified.
	_$1.defaults(options || (options = {}), {
		emulateHTTP: false,
		emulateJSON: false
	});
	// Default JSON-request options.
	var params = { type: type, dataType: 'json'
		// Ensure that we have a URL.
	};if (!options.url) {
		params.url = _$1.result(model, 'url');
	}
	// Ensure that we have the appropriate request data.
	if (options.data === null && model && (method === 'create' || method === 'update' || method === 'patch')) {
		params.contentType = 'application/json';
		params.data = JSON.stringify(options.attrs || model.toJSON(options));
	}
	// For older servers, emulate JSON by encoding the request into an HTML-form.
	if (options.emulateJSON) {
		params.contentType = 'application/x-www-form-urlencoded';
		params.data = params.data ? { model: params.data } : {};
	}
	// For older servers, emulate HTTP by mimicking the HTTP method with `_method`
	// And an `X-HTTP-Method-Override` header.
	if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
		params.type = 'POST';
		if (options.emulateJSON) params.data._method = type;
		var beforeSend = options.beforeSend;
		options.beforeSend = function (xhr) {
			xhr.setRequestHeader('X-HTTP-Method-Override', type);
			if (beforeSend) return beforeSend.call(this, method, model, options);
		};
	}
	// Don't process data on a non-GET request.
	if (params.type !== 'GET' && !options.emulateJSON) {
		params.processData = false;
	}
	// Pass along `textStatus` and `errorThrown` from jQuery.
	var error = options.error;
	options.error = function (xhr, textStatus, errorThrown) {
		options.textStatus = textStatus;
		options.errorThrown = errorThrown;
		if (error) error.call(options.context, xhr, textStatus, errorThrown);
	};
	//Make the request, allowing the user to override any Ajax options.
	// const xhr = new XMLHttpRequest()
	// xhr.open(params.type, params.url, true)
	// xhr.send(params.data)
	// console.log(params.data,JSON.stringify(params.data))
	var xhr = options.xhr = ajax(Object.assign(params, options));
	//model.trigger('request', model, xhr, options)
	return xhr;
}

function ajax(options) {
	var xhr = new XMLHttpRequest();
	var error = options.error;
	var success = options.success;
	xhr.open(options.type, options.url, true);
	if (options.contentType) {
		xhr.setRequestHeader('Content-Type', options.contentType);
	}
	xhr.addEventListener('load', function (e) {
		if (xhr.status === 200) {
			var data = xhr.responseText;
			if (options.dataType === 'json') {
				try {
					data = JSON.parse(data);
				} catch (err) {
					error(xhr, xhr.statusText, err);
				}
			}
			success(data);
		} else {
			error(xhr, xhr.statusText);
		}
	});
	xhr.send(options.data);
	return xhr;
}

var _$2 = require('underscore');

var slice = Array.prototype.slice;

var mixins = function (attribute, methods) {
	return function (Class) {
		_$2.each(methods, function (length, method) {
			if (_$2[method]) Class.prototype[method] = addMethod(length, method, attribute);
		});
		return Class;
	};
};

function addMethod(length, method, attribute) {
	switch (length) {
		case 1:
			return function () {
				return _$2[method](this[attribute]);
			};
		case 2:
			return function (value) {
				return _$2[method](this[attribute], value);
			};
		case 3:
			return function (iteratee, context) {
				return _$2[method](this[attribute], cb(iteratee, this), context);
			};
		case 4:
			return function (iteratee, defaultVal, context) {
				return _$2[method](this[attribute], cb(iteratee, this), defaultVal, context);
			};
		default:
			return function () {
				var args = slice.call(arguments);
				args.unshift(this[attribute]);
				return _$2[method].apply(_$2, args);
			};
	}
}

function cb(iteratee, instance) {
	if (_$2.isFunction(iteratee)) return iteratee;
	if (_$2.isObject(iteratee) && !instance._isModel(iteratee)) return modelMatcher(iteratee);
	if (_$2.isString(iteratee)) return function (model) {
		return model.get(iteratee);
	};
	return iteratee;
}
function modelMatcher(attrs) {
	var matcher = _$2.matches(attrs);
	return function (model) {
		return matcher(model.attributes);
	};
}

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};











var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();





var defineProperty = function (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};

var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};



var inherits = function (subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
};











var possibleConstructorReturn = function (self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
};





var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

var _$3 = require('underscore');

var eventSplitter = /\s+/;
var events = function (target) {
	var output = void 0;
	if (typeof target === 'function') {
		output = target.prototype;
	} else if ((typeof target === 'undefined' ? 'undefined' : _typeof(target)) === 'object') {
		output = target;
	} else {
		return target;
	}
	Object.assign(output, {
		// Bind an event to a `callback` function. Passing `"all"` will bind
		// the callback to all events fired.
		on: function on(name, callback, context) {
			return internalOn(this, name, callback, context);
		},


		// Inversion-of-control versions of `on`. Tell *this* object to listen to
		// an event in another object... keeping track of what it's listening to
		// for easier unbinding later.
		listenTo: function listenTo(obj, name, callback) {
			if (!(obj instanceof Events)) return this;
			var id = obj._listenId || (obj._listenId = _$3.uniqueId('l'));
			var listeningTo = this._listeningTo || (this._listeningTo = {});
			var listening = listeningTo[id];
			// This object is not listening to any other events on `obj` yet.
			// Setup the necessary references to track the listening callbacks.
			if (!listening) {
				var thisId = this._listenId || (this._listenId = _$3.uniqueId('l'));
				listening = listeningTo[id] = {
					obj: obj,
					objId: id,
					id: thisId,
					listeningTo: listeningTo,
					count: 0
				};
			}
			// Bind callbacks on obj, and keep track of them on listening.
			internalOn(obj, name, callback, this, listening);
			return this;
		},


		// Remove one or many callbacks. If `context` is null, removes all
		// callbacks with that function. If `callback` is null, removes all
		// callbacks for the event. If `name` is null, removes all bound
		// callbacks for all events.
		off: function off(name, callback, context) {
			if (!this._events) return this;
			this._events = eventsApi(offApi, this._events, name, callback, {
				context: context,
				listeners: this._listeners
			});
			return this;
		},


		// Tell this object to stop listening to either specific events ... or
		// to every object it's currently listening to.
		stopListening: function stopListening(obj, name, callback) {
			var listeningTo = this._listeningTo;
			if (!listeningTo) return this;
			var ids = obj ? [obj._listenId] : Object.keys(listeningTo);
			for (var i = 0; i < ids.length; i++) {
				var listening = listeningTo[ids[i]];
				// If listening doesn't exist, this object is not currently
				// listening to obj. Break out early.
				if (!listening) break;
				listening.obj.off(name, callback, this);
			}
			return this;
		},


		// Bind an event to only be triggered a single time. After the first time
		// the callback is invoked, its listener will be removed. If multiple events
		// are passed in using the space-separated syntax, the handler will fire
		// once for each event, not once for a combination of all events.
		once: function once(name, callback, context) {
			// Map the event into a `{event: once}` object.
			var events = eventsApi(onceMap, {}, name, callback, _$3.bind(this.off, this));
			if (typeof name === 'string' && context == null) callback = void 0;
			return this.on(events, callback, context);
		},


		// Inversion-of-control versions of `once`.
		listenToOnce: function listenToOnce(obj, name, callback) {
			// Map the event into a `{event: once}` object.
			var events = eventsApi(onceMap, {}, name, callback, _$3.bind(this.stopListening, this, obj));
			return this.listenTo(obj, events);
		},


		// Trigger one or many events, firing all bound callbacks. Callbacks are
		// passed the same arguments as `trigger` is, apart from the event name
		// (unless you're listening on `"all"`, which will cause your callback to
		// receive the true name of the event as the first argument).
		trigger: function trigger(name) {
			if (!this._events) return this;
			var length = Math.max(0, arguments.length - 1);
			var args = Array(length);
			for (var i = 0; i < length; i++) {
				args[i] = arguments[i + 1];
			}eventsApi(triggerApi, this._events, name, void 0, args);
			return this;
		}
	});
	return target;
};
// Iterates over the standard `event, callback` (as well as the fancy multiple
// space-separated events `"change blur", callback` and jQuery-style event
// maps `{event: callback}`).
function eventsApi(iteratee, events, name, callback, opts) {
	var i = 0,
	    names = void 0;
	if (name && (typeof name === 'undefined' ? 'undefined' : _typeof(name)) === 'object') {
		// Handle event maps.
		if (callback !== void 0 && 'context' in opts && opts.context === void 0) opts.context = callback;
		for (names = Object.keys(name); i < names.length; i++) {
			events = eventsApi(iteratee, events, names[i], name[names[i]], opts);
		}
	} else if (name && eventSplitter.test(name)) {
		// Handle space-separated event names by delegating them individually.
		for (names = name.split(eventSplitter); i < names.length; i++) {
			events = iteratee(events, names[i], callback, opts);
		}
	} else {
		// Finally, standard events.
		events = iteratee(events, name, callback, opts);
	}
	return events;
}

// Guard the `listening` argument from the public API.
function internalOn(obj, name, callback, context, listening) {
	obj._events = eventsApi(onApi, obj._events || {}, name, callback, {
		context: context,
		ctx: obj,
		listening: listening
	});
	if (listening) {
		var listeners = obj._listeners || (obj._listeners = {});
		listeners[listening.id] = listening;
	}
	return obj;
}

// The reducing API that adds a callback to the `events` object.
function onApi(events, name, callback, options) {
	if (callback) {
		var handlers = events[name] || (events[name] = []);
		var context = options.context,
		    ctx = options.ctx,
		    listening = options.listening;
		if (listening) listening.count++;
		handlers.push({
			callback: callback,
			context: context,
			ctx: context || ctx,
			listening: listening
		});
	}
	return events;
}

// The reducing API that removes a callback from the `events` object.
function offApi(events, name, callback, options) {
	if (!events) return;
	var i = 0,
	    listening = void 0;
	var context = options.context,
	    listeners = options.listeners;
	// Delete all events listeners and "drop" events.
	if (!name && !callback && !context) {
		var ids = Object.keys(listeners);
		for (; i < ids.length; i++) {
			listening = listeners[ids[i]];
			delete listeners[listening.id];
			delete listening.listeningTo[listening.objId];
		}
		return;
	}
	var names = name ? [name] : Object.keys(events);
	for (; i < names.length; i++) {
		name = names[i];
		var handlers = events[name];
		// Bail out if there are no events stored.
		if (!handlers) break;
		// Replace events if there are any remaining.  Otherwise, clean up.
		var remaining = [];
		for (var j = 0; j < handlers.length; j++) {
			var handler = handlers[j];
			if (callback && callback !== handler.callback && callback !== handler.callback._callback || context && context !== handler.context) {
				remaining.push(handler);
			} else {
				listening = handler.listening;
				if (listening && --listening.count === 0) {
					delete listeners[listening.id];
					delete listening.listeningTo[listening.objId];
				}
			}
		}
		// Update tail event if the list has any events.  Otherwise, clean up.
		if (remaining.length) {
			events[name] = remaining;
		} else {
			delete events[name];
		}
	}
	return events;
}
// Reduces the event callbacks into a map of `{event: onceWrapper}`.
// `offer` unbinds the `onceWrapper` after it has been called.
function onceMap(map, name, callback, offer) {
	if (callback) {
		var once = map[name] = _$3.once(function () {
			offer(name, once);
			callback.apply(this, arguments);
		});
		once._callback = callback;
	}
	return map;
}

// Handles triggering the appropriate event callbacks.
function triggerApi(objEvents, name, callback, args) {
	if (objEvents) {
		var events = objEvents[name];
		var allEvents = objEvents.all;
		if (events && allEvents) allEvents = allEvents.slice();
		if (events) triggerEvents(events, args);
		if (allEvents) triggerEvents(allEvents, [name].concat(args));
	}
	return objEvents;
}
// A difficult-to-believe, but optimized internal dispatch function for
// triggering events. Tries to keep the usual cases speedy (most internal
// Backbone events have 3 arguments).
function triggerEvents(events, args) {
	var ev = void 0,
	    i = -1,
	    l = events.length,
	    a1 = args[0],
	    a2 = args[1],
	    a3 = args[2];
	switch (args.length) {
		case 0:
			while (++i < l) {
				(ev = events[i]).callback.call(ev.ctx);
			}return;
		case 1:
			while (++i < l) {
				(ev = events[i]).callback.call(ev.ctx, a1);
			}return;
		case 2:
			while (++i < l) {
				(ev = events[i]).callback.call(ev.ctx, a1, a2);
			}return;
		case 3:
			while (++i < l) {
				(ev = events[i]).callback.call(ev.ctx, a1, a2, a3);
			}return;
		default:
			while (++i < l) {
				(ev = events[i]).callback.apply(ev.ctx, args);
			}return;
	}
}
// Aliases for backwards compatibility.

var MODEL = Symbol('Model');
var OBSERVER = Symbol('Observer');
var COLLECTION = Symbol('Collection');

var _dec;
var _class;
var _class2;
var _temp;

/**
 * Backbone Model
 *
 * -- rewritten in ES6
 * -- ported by Phong Vu
 */
var _ = require('underscore');
var _set = require('lodash/set');
var _get = require('lodash/get');
var _mapValues = require('lodash/mapValues');
var _cloneDeep = require('lodash/cloneDeep');

var localStorage = global.localStorage;
var COPY = ['idAttribute', 'defaults', 'relations', 'computes'];

var Model$1 = (_dec = mixins('attributes', {
	keys: 1,
	values: 1,
	pairs: 1,
	invert: 1,
	pick: 0,
	omit: 0,
	chain: 1,
	isEmpty: 1
}), events(_class = _dec(_class = (_temp = _class2 = function () {
	createClass(Model, null, [{
		key: 'create',
		value: function create(props, options) {
			var Class = this.define(props);
			var model = new Class({}, options);
			return model.proxy;
		}
	}, {
		key: 'define',
		value: function define(shape) {
			var protos = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
			var statics = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

			switch (typeof shape === 'undefined' ? 'undefined' : _typeof(shape)) {
				case 'object':
					var defaults$$1 = _extends({}, protos.defaults);
					var computes = _extends({}, protos.computes);
					var relations = _extends({}, protos.relations);
					Object.getOwnPropertyNames(shape).forEach(function (key) {
						var prop = Object.getOwnPropertyDescriptor(shape, key);
						if (prop.value) {
							switch (_typeof(prop.value)) {
								case 'function':
									if (prop.value.prototype instanceof Model || prop.value.prototype instanceof Model.Collection) {
										relations[key] = prop.value;
										defaults$$1[key] = relations[key].defaults;
									}
									break;
								case 'object':
									if (!Array.isArray(prop.value)) {
										relations[key] = Model.define(prop.value);
										defaults$$1[key] = relations[key].defaults;
										break;
									}
								default:
									defaults$$1[key] = prop.value;
							}
						} else if (prop.get || prop.set) {
							computes[key] = _.pick(prop, 'get', 'set');
						}
					});
					return this.extend(protos, _extends({
						defaults: defaults$$1,
						computes: computes,
						relations: relations
					}, statics));
				case 'function':
					Object.setPrototypeOf(shape.prototype, this.prototype);
					Object.assign(shape, _.pick(this, COPY));
					return shape;
				default:
					return this;
			}
		}
	}, {
		key: 'extend',
		value: function extend(prototypes, statics) {
			var M = function (_ref) {
				inherits(M, _ref);

				function M() {
					classCallCheck(this, M);
					return possibleConstructorReturn(this, (M.__proto__ || Object.getPrototypeOf(M)).apply(this, arguments));
				}

				return M;
			}(this);

			Object.assign(M, statics, _.pick(prototypes, COPY));
			Object.assign(M.prototype, _.omit(prototypes, COPY));
			return M;
		}
	}, {
		key: 'watch',
		value: function watch(proxy) {
			var observer = proxy[OBSERVER];
			if (observer) {
				for (var _len = arguments.length, args = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
					args[_key - 1] = arguments[_key];
				}

				observer.on.apply(observer, args);
			}
		}
	}]);

	function Model() {
		var _Object$definePropert,
		    _this2 = this;

		classCallCheck(this, Model);

		for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
			args[_key2] = arguments[_key2];
		}

		var _args$ = args[0],
		    attrs = _args$ === undefined ? {} : _args$,
		    _args$2 = args[1],
		    options = _args$2 === undefined ? {} : _args$2;

		this.cid = _.uniqueId(this.cidPrefix);
		this.attributes = {};
		this.proxy = this._createProxy();
		this.changed = {};
		Object.defineProperties(this, (_Object$definePropert = {}, defineProperty(_Object$definePropert, MODEL, { value: true }), defineProperty(_Object$definePropert, OBSERVER, { value: this }), _Object$definePropert));
		Object.assign(this, _.pick(options, 'collection', '_parent', '_relatedKey'));
		this.set(Object.assign(_cloneDeep(_.result(this, 'defaults')) || {}, options.parse ? this.parse(attrs, options) : attrs), options);
		var localStorageKey = options.localStorageKey;
		if (!_.isUndefined(localStorage)) {
			if (!_.isUndefined(localStorageKey)) {
				console.log('begin localStorage');
				var storedData = localStorage.getItem(localStorageKey);
				if (storedData) {
					try {
						this.set(JSON.parse(storedData));
					} catch (e) {
						console.warn('Unable to restore from localStorage #(', localStorageKey, ')');
					}
				}
				this.on('all', _.debounce(function () {
					localStorage.setItem(localStorageKey, JSON.stringify(_this2.toJSON()));
				}, 1000));
			}
		}
		options.localStorageKey = void 0;
		this.initialize.apply(this, args);
	}

	// *[Symbol.iterator]() {
	// 	let i = 0
	// 	const keys = Object.keys(this.attributes)
	// 	while (i < keys.length) yield this.get(keys[i++])
	// }

	createClass(Model, [{
		key: 'initialize',


		// Initialize is an empty function by default. Override it with your own
		// initialization logic.
		value: function initialize() {}
	}, {
		key: 'subscribe',
		value: function subscribe(events$$1, handler, context) {
			var _this3 = this;

			if (typeof events$$1 !== 'string') return;
			if (typeof handler !== 'function') return;
			var keys = events$$1.split(/\s/);
			this.on('change', function () {
				var changes = Object.keys(_this3.changed);
				var matched = _.intersection(keys, changes).length;
				if (matched) {
					handler.call(context);
				}
			});
		}

		// Return a copy of the model's `attributes` object.

	}, {
		key: 'toJSON',
		value: function toJSON() {
			var attr = void 0;
			var obj = {};
			var attrs = Object.assign({}, this.attributes);
			for (var key in attrs) {
				attr = this.get(key);
				if (_.isObject(attr)) {
					if (attr instanceof Model || attr instanceof Model.Collection) {
						attr = (attr[OBSERVER] || attr).toJSON();
					} else {
						var proto = Object.getPrototypeOf(attr);
						if (proto === Array.prototype || proto === Object.prototype) {
							attr = _.clone(attr);
						} else {
							attr = void 0;
						}
					}
				}
				if (!_.isUndefined(attr)) {
					obj[key] = attr;
				}
			}
			return obj;
		}
	}, {
		key: 'toCompactJSON',
		value: function toCompactJSON() {
			var attr = void 0;
			var obj = {};
			for (var key in this.attributes) {
				if (this.attributes.hasOwnProperty(key)) {
					attr = this.attributes[key];
					if (typeof attr.toCompactJSON === 'function') {
						attr = attr.toCompactJSON();
					} else if (typeof attr.toJSON === 'function') {
						attr = attr.toJSON();
					}
					if (_.isEqual(attr, this.defaults[key])) continue;

					obj[key] = attr;
				}
			}
			return obj;
		}

		// Get the value of an attribute.

	}, {
		key: 'get',
		value: function get$$1(key) {
			if (typeof key !== 'string') return void 0;
			var match = void 0;
			var value = this;
			var regex = /(\w+)(?:#(\w+))?/g;
			while (match = regex.exec(key)) {
				var _match = match,
				    _match2 = slicedToArray(_match, 3),
				    m1 = _match2[1],
				    m2 = _match2[2];

				if (value === this) {
					if (m1 in value.computes) {
						value = _get(value.computes[m1], 'get');
					} else {
						value = _get(value.attributes, m1);
					}
					if (typeof value === 'function') {
						value = value.call(this.proxy);
					}
				} else if (value instanceof Model) {
					value = value.get(m1);
				} else if (value instanceof Object) {
					value = value[m1];
				} else {
					value = void 0;
				}
				if (m2) {
					if (isCollection(value)) {
						value = value.at(m2);
					} else if (value instanceof Object) {
						value = value[m2];
					} else {
						value = void 0;
					}
				}
			}
			return value;
		}

		// Get the HTML-escaped value of an attribute.

	}, {
		key: 'escape',
		value: function escape(attr) {
			return _.escape(this.get(attr));
		}

		// Returns `true` if the attribute contains a value that is not null
		// or undefined.

	}, {
		key: 'has',
		value: function has(attr) {
			return this.get(attr) != null;
		}

		// Special-cased proxy to underscore's `_.matches` method.

	}, {
		key: 'matches',
		value: function matches(attrs) {
			return !!_.iteratee(attrs, this)(this.attributes);
		}

		// Set a hash of model attributes on the object, firing `"change"`. This is
		// the core primitive operation of a model, updating the data and notifying
		// anyone who needs to know about the change in state. The heart of the beast.

	}, {
		key: 'set',
		value: function set$$1(key, val, options) {
			var _this4 = this;

			var attrs = void 0,
			    prev = void 0,
			    current = void 0;
			if (key == null) return this;

			// Handle both `"key", value` and `{key: value}` -style arguments.
			if ((typeof key === 'undefined' ? 'undefined' : _typeof(key)) === 'object') {
				attrs = key;
				options = val;
			} else {
				attrs = _set({}, key, val);
			}

			options || (options = {});

			// Run validation.
			if (!this._validate(attrs, options)) return false;

			// Extract attributes and options.
			var unset = options.unset;
			var silent = options.silent;
			var changes = [];
			var changing = this._changing;
			this._changing = true;

			if (!changing) {
				this._previousAttributes = _.clone(this.attributes);
				this.changed = {};
			}
			current = this.attributes, prev = this._previousAttributes;

			// Check for changes of `id`.
			if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

			// For each `set` attribute, update or delete the current value.
			Object.keys(attrs).forEach(function (attr) {
				var value = attrs[attr];
				if (attr in _this4.computes) {
					value = _get(_this4.computes[attr], 'set');
					if (typeof value === 'function') {
						value = value.call(_this4.proxy, val);
					} else {
						value = void 0;
					}
				} else {
					value = _this4.setRelation(attr, value, options);
				}
				if (!_.isUndefined(value) && !_.isFunction(value)) {
					if (current[attr] !== value) changes.push(attr);
					if (prev[attr] !== value) {
						_this4.changed[attr] = value;
					} else {
						delete _this4.changed[attr];
					}
					unset ? delete current[attr] : current[attr] = value;
				}
			});

			// Trigger all relevant attribute changes.
			if (!silent) {
				if (changes.length) this._pending = true;
				for (var i = 0, l = changes.length; i < l; i++) {
					this.trigger('change:' + changes[i], this, current[changes[i]], options);
				}
			}

			if (changing) return this;
			if (!silent) {
				while (this._pending) {
					this._pending = false;
					this.trigger('change', this, options);
					this._triggerParentChange(options);
				}
			}
			this._pending = false;
			this._changing = false;
			return this;
		}
		//
		// Borrowed from "Backbone Nested Models" by "Bret Little"
		//

	}, {
		key: 'setRelation',
		value: function setRelation(attr, val, options) {
			var relation = this.attributes[attr],
			    id = this.idAttribute || 'id',
			    modelToSet = void 0,
			    modelsToAdd = [],
			    modelsToRemove = [];

			if (options.unset && relation) delete relation.parent;

			if (this.relations && _.has(this.relations, attr)) {
				// If the relation already exists, we don't want to replace it, rather
				// update the data within it whether it is a collection or model
				if (relation && relation instanceof Model.Collection) {
					// If the value that is being set is already a collection, use the models
					// within the collection.
					if (val instanceof Model.Collection || val instanceof Array) {
						val = val.models || val;
						modelsToAdd = _.clone(val);

						relation.each(function (model, i) {
							// If the model does not have an "id" skip logic to detect if it already
							// exists and simply add it to the collection
							if (typeof model[id] === 'undefined') return;

							// If the incoming model also exists within the existing collection,
							// call set on that model. If it doesn't exist in the incoming array,
							// then add it to a list that will be removed.
							var rModel = _.find(val, function (_model) {
								return _model[id] === model[id];
							});

							if (rModel) {
								model.set(rModel.toJSON ? rModel.toJSON() : rModel);

								// Remove the model from the incoming list because all remaining models
								// will be added to the relation
								modelsToAdd.splice(i, 1);
							} else {
								modelsToRemove.push(model);
							}
						});

						_.each(modelsToRemove, function (model) {
							relation.remove(model);
						});

						relation.add(modelsToAdd);
					} else {
						// The incoming val that is being set is not an array or collection, then it represents
						// a single model.  Go through each of the models in the existing relation and remove
						// all models that aren't the same as this one (by id). If it is the same, call set on that
						// model.

						relation.each(function (model) {
							if (val[id] === model[id]) {
								model.set(val);
							} else {
								relation.remove(model);
							}
						});
					}

					return relation;
				}

				if (val instanceof Model) {
					val = val.toJSON();
				}

				if (relation && relation instanceof Model) {
					relation.set(val);
					return relation;
				}

				options._parent = this;
				options._relatedKey = attr;

				val = new this.relations[attr](val, options);
				val.parent = this;
			}

			return val;
		}

		// Remove an attribute from the model, firing `"change"`. `unset` is a noop
		// if the attribute doesn't exist.

	}, {
		key: 'unset',
		value: function unset(attr, options) {
			return this.set(attr, void 0, Object.assign({}, options, { unset: true }));
		}

		// Clear all attributes on the model, firing `"change"`.

	}, {
		key: 'clear',
		value: function clear(options) {
			var attrs = {};
			for (var key in this.attributes) {
				if (this.attributes[key] instanceof Model) this.attributes[key].clear(options);else if (isCollection(this.attributes[key])) this.attributes[key].invoke('clear', options), this.attributes[key].reset([]);else attrs[key] = void 0;
			}
			return this.set(attrs, Object.assign({}, options, { unset: true }));
		}

		// Determine if the model has changed since the last `"change"` event.
		// If you specify an attribute name, determine if that attribute has changed.

	}, {
		key: 'hasChanged',
		value: function hasChanged(attr) {
			if (attr == null) return !_.isEmpty(this.changed);
			return _.has(this.changed, attr);
		}

		// Return an object containing all the attributes that have changed, or
		// false if there are no changed attributes. Useful for determining what
		// parts of a view need to be updated and/or what attributes need to be
		// persisted to the server. Unset attributes will be set to undefined.
		// You can also pass an attributes object to diff against the model,
		// determining if there *would be* a change.

	}, {
		key: 'changedAttributes',
		value: function changedAttributes(diff) {
			if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
			var old = this._changing ? this._previousAttributes : this.attributes;
			var changed = {};
			for (var attr in diff) {
				var val = diff[attr];
				if (old[attr] === val) continue;
				changed[attr] = val;
			}
			return _.size(changed) ? changed : false;
		}

		// Get the previous value of an attribute, recorded at the time the last
		// `"change"` event was fired.

	}, {
		key: 'previous',
		value: function previous(attr) {
			if (attr == null || !this._previousAttributes) return null;
			return this._previousAttributes[attr];
		}

		// Get all of the attributes of the model at the time of the previous
		// `"change"` event.

	}, {
		key: 'previousAttributes',
		value: function previousAttributes() {
			return _.clone(this._previousAttributes);
		}

		// Fetch the model from the server, merging the response with the model's
		// local attributes. Any changed attributes will trigger a "change" event.

	}, {
		key: 'fetch',
		value: function fetch(options) {
			options = Object.assign({ parse: true }, options);
			var model = this;
			var success = options.success;
			options.success = function (resp) {
				var serverAttrs = options.parse ? model.parse(resp, options) : resp;
				if (!model.set(serverAttrs, options)) return false;
				if (success) success.call(options.context, model, resp, options);
				model.trigger('sync', model, resp, options);
			};
			wrapError(this, options);
			return sync('read', this, options);
		}

		// Set a hash of model attributes, and sync the model to the server.
		// If the server returns an attributes hash that differs, the model's
		// state will be `set` again.

	}, {
		key: 'save',
		value: function save(key, val, options) {
			// Handle both `"key", value` and `{key: value}` -style arguments.
			var attrs = void 0;
			if (key == null || (typeof key === 'undefined' ? 'undefined' : _typeof(key)) === 'object') {
				attrs = key;
				options = val;
			} else {
				(attrs = {})[key] = val;
			}
			options = Object.assign({ validate: true, parse: true }, options);
			var wait = options.wait;
			// If we're not waiting and attributes exist, save acts as
			// `set(attr).save(null, opts)` with validation. Otherwise, check if
			// the model will be valid when the attributes, if any, are set.
			if (attrs && !wait) {
				if (!this.set(attrs, options)) return false;
			} else if (!this._validate(attrs, options)) {
				return false;
			}
			// After a successful server-side save, the client is (optionally)
			// updated with the server-side state.
			var model = this;
			var success = options.success;
			var attributes = this.attributes;
			options.success = function (resp) {
				// Ensure attributes are restored during synchronous saves.
				model.attributes = attributes;
				var serverAttrs = options.parse ? model.parse(resp, options) : resp;
				if (wait) serverAttrs = Object.assign({}, attrs, serverAttrs);
				if (serverAttrs && !model.set(serverAttrs, options)) return false;
				if (success) success.call(options.context, model, resp, options);
				model.trigger('sync', model, resp, options);
			};
			wrapError(this, options);
			// Set temporary attributes if `{wait: true}` to properly find new ids.
			if (attrs && wait) this.attributes = Object.assign({}, attributes, attrs);
			var method = this.isNew() ? 'create' : options.patch ? 'patch' : 'update';
			if (method === 'patch' && !options.attrs) options.attrs = attrs;
			var xhr = sync(method, this, options);
			// Restore attributes.
			this.attributes = attributes;
			return xhr;
		}

		// Destroy this model on the server if it was already persisted.
		// Optimistically removes the model from its collection, if it has one.
		// If `wait: true` is passed, waits for the server to respond before removal.

	}, {
		key: 'destroy',
		value: function destroy(options) {
			options = options ? _.clone(options) : {};
			var model = this;
			var success = options.success;
			var wait = options.wait;
			var destroy = function destroy() {
				model.stopListening();
				model.trigger('destroy', model, model.collection, options);
			};
			options.success = function (resp) {
				if (wait) destroy();
				if (success) success.call(options.context, model, resp, options);
				if (!model.isNew()) model.trigger('sync', model, resp, options);
			};
			var xhr = false;
			if (this.isNew()) {
				_.defer(options.success);
			} else {
				wrapError(this, options);
				xhr = sync('delete', this, options);
			}
			if (!wait) destroy();
			return xhr;
		}

		// Default URL for the model's representation on the server -- if you're
		// using Backbone's restful methods, override this to change the endpoint
		// that will be called.

	}, {
		key: 'url',
		value: function url() {
			var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
			if (this.isNew()) return base;
			var id = this.get(this.idAttribute);
			return base.replace(/[^/]$/, '$&/') + encodeURIComponent(id);
		}

		// **parse** converts a response into the hash of attributes to be `set` on
		// the model. The default implementation is just to pass the response along.

	}, {
		key: 'parse',
		value: function parse(resp, options) {
			return resp;
		}

		// Create a new model with identical attributes to this one.

	}, {
		key: 'clone',
		value: function clone(options) {
			return new this.constructor(this.toJSON());
		}

		// A model is new if it has never been saved to the server, and lacks an id.

	}, {
		key: 'isNew',
		value: function isNew() {
			return !this.has(this.idAttribute);
		}

		// Check if the model is currently in a valid state.

	}, {
		key: 'isValid',
		value: function isValid(options) {
			return this._validate({}, Object.assign({}, options, { validate: true }));
		}

		// Run validation against the next complete set of model attributes,
		// returning `true` if all is well. Otherwise, fire an `"invalid"` event.

	}, {
		key: '_validate',
		value: function _validate(attrs, options) {
			if (!options.validate || !this.validate) return true;
			attrs = Object.assign({}, this.attributes, attrs);
			var error = this.validationError = this.validate(attrs, options) || null;
			if (!error) return true;
			this.trigger('invalid', this, error, Object.assign(options, { validationError: error }));
			return false;
		}
	}, {
		key: '_createProxy',
		value: function _createProxy() {
			var _this5 = this;

			var attrs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : this.attributes;

			return new Proxy(attrs, {
				has: function has(target, prop) {
					return _this5.has(prop);
				},
				get: function get$$1(target, prop) {
					switch (prop) {
						case '$':
						case '$model':
						case OBSERVER:
							return _this5;
						default:
							var result = _this5.get(prop);
							if (result instanceof Model) return result.proxy;
							return result;
					}
				},
				set: function set$$1(target, prop, value) {
					_this5.set(prop, value);
					return true;
				},
				getPrototypeOf: function getPrototypeOf(target) {
					return Object.getPrototypeOf(_this5);
				},
				setPrototypeOf: function setPrototypeOf(target, proto) {
					return true;
				},

				deleteProperty: function deleteProperty(target, prop) {
					_this5.unset(prop);
					return true;
				},
				defineProperty: function defineProperty$$1(target, prop, descriptor) {
					return true;
				},
				ownKeys: function ownKeys(target) {
					return _this5.keys();
				}
			});
		}
	}, {
		key: '_triggerParentChange',
		value: function _triggerParentChange(options) {
			var parent = this.collection || this._parent;
			if (!parent) return;
			var relatedKey = this._relatedKey || this.id;
			Object.assign({}, options, { chained: true });

			parent.changed = {};

			if (relatedKey != null) {
				// Loop through every changed attribute
				for (var key in this.changed) {
					parent.changed[relatedKey + '.' + key] = this.changed[key];
					parent.trigger('change:' + relatedKey + '.' + key, parent, this.changed[key], options);
				}
				parent.changed[relatedKey] = undefined;
				parent.trigger('change:' + relatedKey, parent, this, options);
			}
			if (this.collection) {
				parent._triggerParentChange(this, options);
			} else {
				parent.trigger('change', parent, options);
				parent._triggerParentChange(options);
			}
		}
	}, {
		key: 'defaults',
		get: function get$$1() {
			return this.constructor.defaults;
		}
	}, {
		key: 'relations',
		get: function get$$1() {
			return this.constructor.relations;
		}
	}, {
		key: 'computes',
		get: function get$$1() {
			return this.constructor.computes;
		}
	}, {
		key: 'idAttribute',
		get: function get$$1() {
			return this.constructor.idAttribute;
		}
	}, {
		key: 'cidPrefix',
		get: function get$$1() {
			return 'c';
		}
	}]);
	return Model;
}(), _class2.idAttribute = 'id', _class2.relations = {}, _class2.computes = {}, _class2.defaults = {}, _temp)) || _class) || _class);
function isCollection(instance) {
	return instance instanceof Model$1.Collection;
	return (typeof instance === 'undefined' ? 'undefined' : _typeof(instance)) === 'object' && instance[COLLECTION] === true;
}

// Throw an error when a URL is needed, and none is supplied.
function urlError() {
	console.warn('A "url" property or function must be specified');
}

// Wrap an optional error callback with a fallback error event.
function wrapError(model, options) {
	var error = options.error;
	options.error = function (resp) {
		if (error) error.call(options.context, model, resp, options);
		model.trigger('error', model, resp, options);
	};
}

var _dec$1;
var _class$1;
var _class2$1;
var _temp$1;

var _$4 = require('underscore');

var _slice = Array.prototype.slice;
var setOptions = { add: true, remove: true, merge: true };
var addOptions = { add: true, remove: false };

var Collection$1 = (_dec$1 = mixins('models', {
	forEach: 3,
	each: 3,
	map: 3,
	collect: 3,
	reduce: 0,
	foldl: 0,
	inject: 0,
	reduceRight: 0,
	foldr: 0,
	find: 3,
	detect: 3,
	filter: 3,
	select: 3,
	reject: 3,
	every: 3,
	all: 3,
	some: 3,
	any: 3,
	include: 3,
	includes: 3,
	contains: 3,
	invoke: 0,
	max: 3,
	min: 3,
	toArray: 1,
	size: 1,
	first: 3,
	head: 3,
	take: 3,
	initial: 3,
	rest: 3,
	tail: 3,
	drop: 3,
	last: 3,
	without: 0,
	difference: 0,
	indexOf: 3,
	shuffle: 1,
	lastIndexOf: 3,
	isEmpty: 1,
	chain: 1,
	sample: 3,
	partition: 3,
	groupBy: 3,
	countBy: 3,
	sortBy: 3,
	indexBy: 3,
	findIndex: 3,
	findLastIndex: 3
}), events(_class$1 = _dec$1(_class$1 = (_temp$1 = _class2$1 = function () {
	createClass(Collection, null, [{
		key: 'of',
		value: function of(model, protos, statics) {
			return this.extend(protos, _extends({
				model: model
			}, statics));
		}
	}, {
		key: 'extend',
		value: function extend(prototypes, statics) {
			var C = function (_ref) {
				inherits(C, _ref);

				function C() {
					classCallCheck(this, C);
					return possibleConstructorReturn(this, (C.__proto__ || Object.getPrototypeOf(C)).apply(this, arguments));
				}

				return C;
			}(this);

			Object.assign(C, statics, _$4.pick(prototypes, 'model'));
			Object.assign(C.prototype, _$4.omit(prototypes, 'model'));
			return C;
		}
	}]);

	function Collection(models, options) {
		classCallCheck(this, Collection);

		this[COLLECTION] = true;
		this[OBSERVER] = this;
		options || (options = {});
		if (options.model) Object.defineProperty(this, 'model', { value: options.model });
		if (options.comparator !== void 0) this.comparator = options.comparator;
		this._reset();
		Object.assign(this, _$4.pick(options, '_parent', '_relatedKey'));
		this.initialize.call(this, models, options);
		if (models) this.reset(models, Object.assign({ silent: true }, options));
		this.on('update reset sort', this._triggerParentChange);
	}

	createClass(Collection, [{
		key: 'initialize',


		// The default model for a collection is just a **Backbone.Model**.
		// This should be overridden in most cases.
		// Initialize is an empty function by default. Override it with your own
		// initialization logic.
		value: function initialize() {}
		// The JSON representation of a Collection is an array of the
		// models' attributes.

	}, {
		key: 'toJSON',
		value: function toJSON(options) {
			return this.map(function (model) {
				return model.toJSON(options);
			});
		}
	}, {
		key: 'toCompactJSON',
		value: function toCompactJSON() {
			var models = _$4(this.models).map(function (model) {
				return model instanceof Model$1 ? model.toCompactJSON() : model.toJSON();
			});
			return models;
		}
	}, {
		key: 'subscribe',
		value: function subscribe(type, handler, context) {
			if (typeof type !== 'string') return;
			if (typeof handler !== 'function') return;
			var keys = type.split(/\s/);
			this.on('all', function (event) {
				if (keys.includes(event)) {
					handler.call(context);
				}
			});
		}
		// Add a model, or list of models to the set. `models` may be Backbone
		// Models or raw JavaScript objects to be converted to Models, or any
		// combination of the two.

	}, {
		key: 'add',
		value: function add(models, options) {
			return this.set(models, Object.assign({ merge: false }, options, addOptions));
		}
		// Remove a model, or a list of models from the set.

	}, {
		key: 'remove',
		value: function remove(models, options) {
			options = Object.assign({}, options);
			var singular = !_$4.isArray(models);
			models = singular ? [models] : models.slice();
			var removed = this._removeModels(models, options);
			if (!options.silent && removed.length) {
				options.changes = { added: [], merged: [], removed: removed };
				this.trigger('update', this, options);
			}
			return singular ? removed[0] : removed;
		}
	}, {
		key: 'removeAt',
		value: function removeAt(index) {
			this.remove(this.at(index));
		}
		// Update a collection by `set`-ing a new list of models, adding new ones,
		// removing models that are no longer present, and merging models that
		// already exist in the collection, as necessary. Similar to **Model#set**,
		// the core operation for updating the data contained by the collection.

	}, {
		key: 'set',
		value: function set$$1(models, options) {
			if (models == null) return;

			options = Object.assign({}, setOptions, options);
			if (options.parse && !this._isModel(models)) {
				models = this.parse(models, options) || [];
			}

			var singular = !_$4.isArray(models);
			models = singular ? [models] : models.slice();

			var at = options.at;
			if (at != null) at = +at;
			if (at > this.length) at = this.length;
			if (at < 0) at += this.length + 1;

			var set$$1 = [];
			var toAdd = [];
			var toMerge = [];
			var toRemove = [];
			var modelMap = {};

			var add = options.add;
			var merge = options.merge;
			var remove = options.remove;

			var sort = false;
			var sortable = this.comparator && at == null && options.sort != false;
			var sortAttr = _$4.isString(this.comparator) ? this.comparator : null;

			// Turn bare objects into model references, and prevent invalid models
			// from being added.
			var model = void 0,
			    i = void 0;
			for (i = 0; i < models.length; i++) {
				model = models[i];

				// If a duplicate is found, prevent it from being added and
				// optionally merge it into the existing model.
				var existing = this.get(model);
				if (existing) {
					if (merge && model != existing) {
						var attrs = this._isModel(model) ? model.attributes : model;
						if (options.parse) attrs = existing.parse(attrs, options);
						existing.set(attrs, options);
						toMerge.push(existing);
						if (sortable && !sort) sort = existing.hasChanged(sortAttr);
					}
					if (!modelMap[existing.cid]) {
						modelMap[existing.cid] = true;
						set$$1.push(existing);
					}
					models[i] = existing;

					// If this is a new, valid model, push it to the `toAdd` list.
				} else if (add) {
					model = models[i] = this._prepareModel(model, options);
					if (model) {
						toAdd.push(model);
						this._addReference(model, options);
						modelMap[model.cid] = true;
						set$$1.push(model);
					}
				}
			}

			// Remove stale models.
			if (remove) {
				for (i = 0; i < this.length; i++) {
					model = this.models[i];
					if (!modelMap[model.cid]) toRemove.push(model);
				}
				if (toRemove.length) this._removeModels(toRemove, options);
			}

			// See if sorting is needed, update `length` and splice in new models.
			var orderChanged = false;
			var replace = !sortable && add && remove;
			if (set$$1.length && replace) {
				orderChanged = this.length != set$$1.length || _$4.some(this.models, function (m, index) {
					return m != set$$1[index];
				});
				this.models.length = 0;
				splice(this.models, set$$1, 0);
				this.length = this.models.length;
			} else if (toAdd.length) {
				if (sortable) sort = true;
				splice(this.models, toAdd, at == null ? this.length : at);
				this.length = this.models.length;
			}

			// Silently sort the collection if appropriate.
			if (sort) this.sort({ silent: true });

			// Unless silenced, it's time to fire all appropriate add/sort/update events.
			if (!options.silent) {
				for (i = 0; i < toAdd.length; i++) {
					if (at != null) options.index = at + i;
					model = toAdd[i];
					model.trigger('add', model, this, options);
				}
				if (sort || orderChanged) this.trigger('sort', this, options);
				if (toAdd.length || toRemove.length || toMerge.length) {
					options.changes = {
						added: toAdd,
						removed: toRemove,
						merged: toMerge
					};
					this.trigger('update', this, options);
				}
			}

			// Return the added (or merged) model (or models).
			return singular ? models[0] : models;
		}
		// When you have more items than you want to add or remove individually,
		// you can reset the entire set with a new list of models, without firing
		// any granular `add` or `remove` events. Fires `reset` when finished.
		// Useful for bulk operations and optimizations.

	}, {
		key: 'reset',
		value: function reset(models, options) {
			options || (options = {});
			for (var i = 0, l = this.models.length; i < l; i++) {
				this._removeReference(this.models[i]);
			}
			options.previousModels = this.models;
			this._reset();
			this.add(models, Object.assign({ silent: true }, options));
			if (!options.silent) {
				this.trigger('reset', this, options);
				this.resetRelations(options);
			}
			return this;
		}
		// reset(models, options) {
		// 	options = options ? _.clone(options) : {}
		// 	for (let i = 0; i < this.models.length; i++) {
		// 		this._removeReference(this.models[i], options)
		// 	}
		// 	options.previousModels = this.models
		// 	this._reset()
		// 	models = this.add(models, Object.assign({ silent: true }, options))
		// 	if (!options.silent) this.trigger('reset', this, options)
		// 	return models
		// }

	}, {
		key: 'resetRelations',
		value: function resetRelations(options) {
			_$4.each(this.models, function (model) {
				_$4.each(model.relations, function (rel, key) {
					if (model.get(key) instanceof Collection) {
						model.get(key).trigger('reset', model, options);
					}
				});
			});
		}

		// Add a model to the end of the collection.

	}, {
		key: 'push',
		value: function push(model, options) {
			return this.add(model, Object.assign({ at: this.length }, options));
		}
		// Remove a model from the end of the collection.

	}, {
		key: 'pop',
		value: function pop(options) {
			var model = this.at(this.length - 1);
			return this.remove(model, options);
		}
		// Add a model to the beginning of the collection.

	}, {
		key: 'unshift',
		value: function unshift(model, options) {
			return this.add(model, Object.assign({ at: 0 }, options));
		}
		// Remove a model from the beginning of the collection.

	}, {
		key: 'shift',
		value: function shift(options) {
			var model = this.at(0);
			return this.remove(model, options);
		}
		// Slice out a sub-array of models from the collection.

	}, {
		key: 'slice',
		value: function slice() {
			for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
				args[_key] = arguments[_key];
			}

			return _slice.apply(this.models, args);
		}
		// Get a model from the set by id, cid, model object with id or cid
		// properties, or an attributes object that is transformed through modelId.

	}, {
		key: 'get',
		value: function get$$1(obj) {
			if (obj == null) return void 0;
			return this._byId[obj] || this._byId[this.modelId(obj.attributes || obj)] || obj.cid && this._byId[obj.cid];
		}
		// Returns `true` if the model is in the collection.

	}, {
		key: 'has',
		value: function has(obj) {
			return this.get(obj) != null;
		}
		// Get the model at the given index.

	}, {
		key: 'at',
		value: function at(index) {
			if (index < 0) index += this.length;
			return this.models[index];
		}
		// Return models with matching attributes. Useful for simple cases of
		// `filter`.

	}, {
		key: 'where',
		value: function where(attrs, first) {
			return this[first ? 'find' : 'filter'](attrs);
		}
		// Return the first model with matching attributes. Useful for simple cases
		// of `find`.

	}, {
		key: 'findWhere',
		value: function findWhere(attrs) {
			return this.where(attrs, true);
		}
		// Force the collection to re-sort itself. You don't need to call this under
		// normal circumstances, as the set will maintain sort order as each item
		// is added.

	}, {
		key: 'sort',
		value: function sort(options) {
			var comparator = this.comparator;
			if (!comparator) throw new Error('Cannot sort a set without a comparator');
			options || (options = {});

			var length = comparator.length;
			if (_$4.isFunction(comparator)) comparator = _$4.bind(comparator, this);

			// Run sort based on type of `comparator`.
			if (length == 1 || _$4.isString(comparator)) {
				this.models = this.sortBy(comparator);
			} else {
				this.models.sort(comparator);
			}
			if (!options.silent) this.trigger('sort', this, options);
			return this;
		}
		// Pluck an attribute from each model in the collection.

	}, {
		key: 'pluck',
		value: function pluck(attr) {
			return this.map('' + attr);
		}
		// Fetch the default set of models for this collection, resetting the
		// collection when they arrive. If `reset: true` is passed, the response
		// data will be passed through the `reset` method instead of `set`.

	}, {
		key: 'fetch',
		value: function fetch(options) {
			var _this2 = this;

			options = Object.assign({ parse: true }, options);
			var success = options.success;
			var error = options.error;
			options.success = function (resp) {
				var method = options.reset ? 'reset' : 'set';
				_this2[method](resp, options);
				if (success) success.call(options.context, _this2, resp, options);
				_this2.trigger('sync', _this2, resp, options);
			};
			options.error = function (resp) {
				if (error) error.call(options.context, _this2, resp, options);
				_this2.trigger('error', _this2, resp, options);
			};
			return sync('read', this, options);
		}
		// Create a new instance of a model in this collection. Add the model to the
		// collection immediately, unless `wait: true` is passed, in which case we
		// wait for the server to agree.

	}, {
		key: 'create',
		value: function create(model, options) {
			options = options ? _$4.clone(options) : {};
			var wait = options.wait;
			model = this._prepareModel(model, options);
			if (!model) return false;
			if (!wait) this.add(model, options);
			var collection = this;
			var success = options.success;
			options.success = function (m, resp, callbackOpts) {
				if (wait) collection.add(m, callbackOpts);
				if (success) success.call(callbackOpts.context, m, resp, callbackOpts);
			};
			model.save(null, options);
			return model;
		}
		// **parse** converts a response into a list of models to be added to the
		// collection. The default implementation is just to pass it through.

	}, {
		key: 'parse',
		value: function parse(resp, options) {
			return resp;
		}
		// Create a new collection with an identical list of models as this one.

	}, {
		key: 'clone',
		value: function clone() {
			return new this.constructor(this.models, {
				model: this.model,
				comparator: this.comparator
			});
		}
		// Define how to uniquely identify models in the collection.

	}, {
		key: 'modelId',
		value: function modelId(attrs) {
			return attrs[this.model.prototype.idAttribute || 'id'];
		}
		// Private method to reset all internal state. Called when the collection
		// is first initialized or reset.

	}, {
		key: '_reset',
		value: function _reset() {
			this.length = 0;
			this.models = [];
			this._byId = {};
		}
		// Prepare a hash of attributes (or other model) to be added to this
		// collection.

	}, {
		key: '_prepareModel',
		value: function _prepareModel(attrs, options) {
			if (attrs instanceof Model$1) return attrs;
			options = options ? _$4.clone(options) : {};
			options.collection = this;

			var modelClass = this.model;
			var model = new modelClass(attrs, options);
			if (!model.validationError) return model;
			this.trigger('invalid', this, model.validationError, options);
			return false;
		}
		// _prepareModel(attrs, options) {
		// 	if (this._isModel(attrs)) {
		// 		if (!attrs.collection) attrs.collection = this
		// 		return attrs
		// 	}
		// 	options = options ? _.clone(options) : {}
		// 	options.collection = this
		// 	const model = new this.model(attrs, options)
		// 	if (!model.validationError) return model
		// 	this.trigger('invalid', this, model.validationError, options)
		// 	return false
		// }

		// Internal method called by both remove and set.

	}, {
		key: '_removeModels',
		value: function _removeModels(models, options) {
			var removed = [];
			for (var i = 0; i < models.length; i++) {
				var model = this.get(models[i]);
				if (!model) continue;
				var index = this.indexOf(model);
				this.models.splice(index, 1);
				this.length--;

				// Remove references before triggering 'remove' event to prevent an
				// infinite loop. #3693
				delete this._byId[model.cid];
				var id = this.modelId(model.attributes);
				if (id != null) delete this._byId[id];

				if (!options.silent) {
					options.index = index;
					model.trigger('remove', model, this, options);
				}

				removed.push(model);
				this._removeReference(model, options);
			}
			return removed;
		}
		// Method for checking whether an object should be considered a model for
		// the purposes of adding to the collection.

	}, {
		key: '_isModel',
		value: function _isModel(model) {
			return model instanceof Model$1;
		}
		// Internal method to create a model's ties to a collection.

	}, {
		key: '_addReference',
		value: function _addReference(model, options) {
			this._byId[model.cid] = model;
			var id = this.modelId(model.attributes);
			if (id != null) this._byId[id] = model;
			model.on('all', this._onModelEvent, this);
		}
		// Internal method to sever a model's ties to a collection.

	}, {
		key: '_removeReference',
		value: function _removeReference(model, options) {
			delete this._byId[model.cid];
			var id = this.modelId(model.attributes);
			if (id != null) delete this._byId[id];
			if (this === model.collection) delete model.collection;
			model.off('all', this._onModelEvent, this);
		}
		// Internal method called every time a model in the set fires an event.
		// Sets need to update their indexes when models change ids. All other
		// events simply proxy through. "add" and "remove" events that originate
		// in other collections are ignored.

	}, {
		key: '_onModelEvent',
		value: function _onModelEvent() {
			for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
				args[_key2] = arguments[_key2];
			}

			var event = args[0],
			    model = args[1],
			    collection = args[2],
			    options = args[3];

			if (model) {
				if ((event === 'add' || event === 'remove') && collection !== this) return;
				if (event === 'destroy') this.remove(model, options);
				if (event === 'change') {
					var prevId = this.modelId(model.previousAttributes());
					var id = this.modelId(model.attributes);
					if (prevId != id) {
						if (prevId != null) delete this._byId[prevId];
						if (id != null) this._byId[id] = model;
					}
				}
			}
			this.trigger.apply(this, args);
		}
	}, {
		key: '_triggerParentChange',
		value: function _triggerParentChange(model, options) {
			var parent = this._parent;
			if (!parent) return;

			// If this change event is triggered by one of its child model
			if (model && model.collection) {
				var modelID = model.id;

				parent.changed = {};
				Object.assign(options, { chained: true });

				// Loop through every changed attributes of this model
				for (var key in model.changed) {
					// if (!_.isUndefined(modelID)) {
					// 	// Trigger "change:collection.id.child"
					// 	parent.changed[`${this._relatedKey}.${modelID}.${key}`] =
					// 		model.changed[key]
					// 	parent.trigger(
					// 		`change:${this._relatedKey}.${modelID}.${key}`,
					// 		parent,
					// 		model.changed[key],
					// 		options
					// 	)
					//
					// 	// Trigger "change:collection.child"
					// 	parent.changed[`${this._relatedKey}.${modelID}`] =
					// 		model.changed[key]
					// 	parent.trigger(
					// 		`change:${this._relatedKey}.${modelID}`,
					// 		parent,
					// 		model.changed[key],
					// 		options
					// 	)
					// }
					// Trigger "change:collection.child"
					parent.changed[this._relatedKey + '.' + key] = model.changed[key];
					parent.trigger('change:' + this._relatedKey + '.' + key, parent, model.changed[key], options);
				}

				// Trigger "change:collection"
				parent.changed[this._relatedKey] = this;
				parent.trigger('change:' + this._relatedKey, parent, options);
				parent._triggerParentChange(options);
			}

			parent.changed[this._relatedKey] = this;

			// Finally trigger "change"
			parent.trigger('change', parent, options);
		}
	}, {
		key: 'model',
		get: function get$$1() {
			return this.constructor.model;
		}
	}, {
		key: 'proxy',
		get: function get$$1() {
			return this;
		}
	}]);
	return Collection;
}(), _class2$1.model = Model$1, _temp$1)) || _class$1) || _class$1);
Model$1.Collection = Collection$1;
Collection$1[COLLECTION] = true;

function splice(array, insert, at) {
	at = Math.min(Math.max(at, 0), array.length);
	var tail = Array(array.length - at);
	var length = insert.length;
	var i = void 0;
	for (i = 0; i < tail.length; i++) {
		tail[i] = array[i + at];
	}for (i = 0; i < length; i++) {
		array[i + at] = insert[i];
	}for (i = 0; i < tail.length; i++) {
		array[i + length + at] = tail[i];
	}
}

function Model() {
	for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
		args[_key] = arguments[_key];
	}

	if (!(this instanceof Model)) {
		return Model$1.define.apply(Model$1, args);
	}
	return new (Function.prototype.bind.apply(Model$1, [null].concat(args)))();
}

Object.setPrototypeOf(Model.prototype, Model$1.prototype);
Model.isValid = function (instance) {
	return instance instanceof Model$1;
};
Model.define = Model$1.define.bind(Model$1);
Model.create = Model$1.create.bind(Model$1);
Model.extend = Model$1.extend.bind(Model$1);
Model.watch = Model$1.watch.bind(Model$1);

function Collection() {
	for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
		args[_key2] = arguments[_key2];
	}

	if (!(this instanceof Collection)) {
		return Collection$1.of.apply(Collection$1, args);
	}
	return new (Function.prototype.bind.apply(Collection$1, [null].concat(args)))();
}

Object.setPrototypeOf(Collection.prototype, Collection$1.prototype);
Collection.isValid = function (instance) {
	return instance instanceof Collection$1;
};
Collection.of = Collection$1.of.bind(Collection$1);
Collection.extend = Collection$1.extend.bind(Collection$1);

exports._Model = Model$1;
exports._Collection = Collection$1;
exports.Model = Model;
exports.Collection = Collection;
