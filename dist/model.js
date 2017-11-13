'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

/*-- Backbone-x 0.0.1           -- */
/*-- Author: phong.vu@me.com    -- */

void function (root, factory) {
	// Set up Backbone appropriately for the environment. Start with AMD.
	if (typeof define === 'function' && define.amd) {
		define(['lodash', 'backbone', 'exports'], function (_, Backbone, exports) {
			// Export global even in AMD case in case this script is loaded with
			// others that may still expect a global Backbone.
			root.B = factory(root, exports, _, Backbone);
		});

		// Next for Node.js or CommonJS.
	} else if (typeof exports !== 'undefined') {
		var _ = require('lodash');
		var Backbone = require('backbone');
		factory(root, exports, _, Backbone);

		// Finally, as a browser global.
	} else {
		root.B = factory(root, root.B || {}, root._, root.Backbone);
	}
}(window, function (root, B, _, Backbone) {
	var chrome = root.chrome;
	var Model = void 0,
	    Collection = void 0,
	    Compute = void 0,
	    localStorage = void 0;
	var BackboneModel = Backbone.Model;
	var BackboneCollection = Backbone.Collection;
	localStorage = global.localStorage;

	/* --- Compute --- */
	Compute = B.Compute = function () {
		function Compute(deps, options) {
			if (!(this instanceof Compute)) return new Compute(deps, options);
			if (_.isArray(deps) && _.isFunction(options)) options = { deps: deps, get: options };else if (_.isFunction(deps)) options = _.defaults({ get: deps }, options);else options = deps || {};

			_.defaults(this, options, {
				deps: [],
				init: function init() {
					return null;
				},
				get: function get(value) {
					return value;
				},
				set: function set(value) {
					return value;
				}
			});
		}

		return Compute;
	}();
	/* --- Model --- */
	Model = B.Model = function () {
		function Model() {
			var _this = this;

			var attrs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
			var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

			if (!(this instanceof Model)) {
				if (isPrototypeOf(attrs, Model)) return attrs.create.apply(attrs, _(arguments).slice(1));
				return Model.create.apply(Model, arguments);
			}
			var localStorageKey = options.localStorageKey;
			options.localStorageKey = void 0;
			_.extend(this, _.pick(options, '_parent', '_relatedKey'));
			_.each(this.computes, this._registerComputeValue, this);
			BackboneModel.apply(this, arguments);
			if (!_.isUndefined(localStorage) && !_.isUndefined(localStorageKey)) {
				var storedData = localStorage.getItem(localStorageKey);
				if (storedData) {
					try {
						this.set(JSON.parse(storedData));
					} catch (e) {
						console.warn('Unable to restore from localStorage #(', localStorageKey, ')');
					}
				}
				this.on('all', _.debounce(function () {
					localStorage.setItem(localStorageKey, JSON.stringify(_this.toLocalStorageJSON()));
				}, 1000));
			}
			// _.each(this.relations, function(ownerClass, attr) {
			// this.setRelation(attr, this.attributes[attr], { _parent: this })
			// }, this);
		}

		Object.setPrototypeOf(Model.prototype, BackboneModel.prototype);

		// prototypes
		_.extend(Model.prototype, {
			relations: {},
			computes: {},
			defaults: {},

			get root() {
				var root = this;
				var parent = this.collection || this._parent;
				while (parent) {
					root = parent;
					parent = parent.collection || parent._parent;
				}
				return root;
			},

			subscribe: function subscribe(events, handler, context) {
				var _this2 = this;

				if (typeof events !== 'string') return;
				if (typeof handler !== 'function') return;
				var keys = events.split(/\s/);
				this.on('change', function () {
					var changes = Object.keys(_this2.changed);
					var matched = _.intersection(keys, changes).length;
					if (matched) {
						handler.call(context);
					}
				});
			},


			get: function get(key) {
				var value = this;
				var regex = /(\w+)(?:#(\w+))?/g;
				var match = void 0;
				while (match = regex.exec(key)) {
					value = value instanceof BackboneModel ? getComputedValue(value, match[1]) : (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object' ? value[match[1]] : undefined;
					if (match[2]) value = value instanceof BackboneCollection ? value.get(match[2]) : value[match[2]];
				}
				return value;
			},

			//
			// Borrowed from "Backbone Nested Models" by "Bret Little"
			//
			setRelation: function setRelation(attr, val, options) {
				var relation = this.attributes[attr],
				    id = this.idAttribute || 'id',
				    modelToSet = void 0,
				    modelsToAdd = [],
				    modelsToRemove = [];

				if (options.unset && relation) delete relation.parent;

				if (this.relations && _.has(this.relations, attr)) {
					// If the relation already exists, we don't want to replace it, rather
					// update the data within it whether it is a collection or model
					if (relation && relation instanceof Collection) {
						// If the val that is being set is already a collection, use the models
						// within the collection.
						if (val instanceof Collection || val instanceof Array) {
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
			},
			set: function set(key, val, options) {
				if ((typeof key === 'undefined' ? 'undefined' : _typeof(key)) === 'object') {
					options = val;
					return this._set(key, options);
				}
				if (typeof key === 'string') {
					return this._set(_.set({}, key, val), options);
				}
				return this;
			},
			_set: function _set(key, val, options) {
				var attr = void 0,
				    attrs = void 0,
				    unset = void 0,
				    changes = void 0,
				    silent = void 0,
				    changing = void 0,
				    prev = void 0,
				    current = void 0;
				if (key == null) return this;

				// Handle both `"key", value` and `{key: value}` -style arguments.
				if ((typeof key === 'undefined' ? 'undefined' : _typeof(key)) === 'object') {
					attrs = key;
					options = val;
				} else {
					(attrs = {})[key] = val;
				}

				options || (options = {});

				// Run validation.
				if (!this._validate(attrs, options)) return false;

				// Extract attributes and options.
				unset = options.unset;
				silent = options.silent;
				changes = [];
				changing = this._changing;
				this._changing = true;

				if (!changing) {
					this._previousAttributes = _.clone(this.attributes);
					this.changed = {};
				}
				current = this.attributes, prev = this._previousAttributes;

				// Check for changes of `id`.
				if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

				// For each `set` attribute, update or delete the current value.
				for (attr in attrs) {
					val = attrs[attr];
					if (this.computes[attr]) {
						val = this.computes[attr].set.call(this, val, options);
					} else {
						// Inject in the relational lookup
						val = this.setRelation(attr, val, options);
					}
					if (_.isUndefined(val)) continue;

					if (current[attr] !== val) changes.push(attr);
					if (prev[attr] !== val) {
						this.changed[attr] = val;
					} else {
						delete this.changed[attr];
					}
					unset ? delete current[attr] : current[attr] = val;
				}

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
			},
			clone: function clone(options) {
				return new this.constructor(this.toJSON());
			},
			clear: function clear(options) {
				var attrs = {};
				for (var key in this.attributes) {
					if (this.attributes[key] instanceof BackboneModel) this.attributes[key].clear(options);else if (this.attributes[key] instanceof BackboneCollection) this.attributes[key].invoke('clear', options), this.attributes[key].reset([]);else attrs[key] = void 0;
				}
				return this.set(attrs, _.extend({}, options, { unset: true }));
			},
			toJSON2: function toJSON2(options) {
				var attrs = _.clone(this.attributes);
				attrs.__proto__ = null;

				_.each(this.relations, function (rel, key) {
					if (_.has(attrs, key)) {
						attrs[key] = attrs[key].toJSON();
					} else {
						attrs[key] = new rel().toJSON();
					}
				});

				return attrs;
			},
			toLocalStorageJSON: function toLocalStorageJSON() {
				return _.mapObject(this.attributes, function (value) {
					if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
						return value;
					}
					if (value && (typeof value === 'undefined' ? 'undefined' : _typeof(value)) === 'object') {
						var proto = Object.getPrototypeOf(value);
						if (proto === Array.prototype || proto === Object.prototype) {
							return value;
						}
					}
					if (value instanceof Model) {
						return value.toLocalStorageJSON();
					}
					return void 0;
				});
			},

			toJSON: function toJSON() {
				var attr = void 0;
				var obj = {};
				var attrs = _.extend({}, this.attributes);
				for (var key in attrs) {
					attr = this.get(key);
					if (attr instanceof BackboneModel || attr instanceof BackboneCollection) attr = attr.toJSON();else if (_.isObject(attr)) attr = _.clone(attr);
					obj[key] = attr;
				}
				return obj;
			},
			toCompactJSON: function toCompactJSON() {
				var attr = void 0,
				    obj = {};
				for (var key in this.attributes) {
					if (this.attributes.hasOwnProperty(key)) {
						attr = this.attributes[key];
						if (attr instanceof Model || attr instanceof Collection) attr = attr.toCompactJSON();else if (attr instanceof BackboneModel || attr instanceof BackboneCollection) attr = attr.toJSON();

						if (attr instanceof Compute) continue;
						if (_.isEqual(attr, this.defaults[key])) continue;

						obj[key] = attr;
					}
				}
				return obj;
			},
			_triggerParentChange: function _triggerParentChange(options) {
				var parent = this.collection || this._parent;
				if (!parent) return;

				parent.changed = {};
				_.extend(options, { chained: true });

				// Loop through every changed attribute
				for (var key in this.changed) {
					// Trigger "change:this.attr"
					parent.changed[this._relatedKey + '.' + key] = this.changed[key];
					parent.trigger('change:' + this._relatedKey + '.' + key, parent, this.changed[key], options);
				}
				//parent.changed[ this._relatedKey ] = this;
				parent.changed[this._relatedKey] = undefined;

				parent.trigger('change:' + this._relatedKey, parent, this, options);
				parent.trigger('change', parent, options);
				if (this.collection) {
					_.defer(function () {
						parent._triggerParentChange(this, options);
					}.bind(this));
				} else {
					parent._triggerParentChange(options);
				}
			},
			_registerComputeValue: function _registerComputeValue(compute, attr) {
				_.each(compute.deps, function (depAttr) {
					this.on('change:' + depAttr, function (model, value, options) {
						var value = model.get(depAttr);
						if (value instanceof BackboneModel || value instanceof Collection) {
							model.changed[attr] = undefined;
							_.each(value.changed, function (subValue, subAttr) {
								model.changed[subAttr] = subValue;
								model.trigger('change:' + attr + '.' + subAttr, model, subValue, options);
							});
						} else {
							model.changed[attr] = value;
						}
						model.trigger('change:' + attr, model, value, options);
						model.trigger('change', model, options);
					});
				}, this);
			},
			alias: function alias(model) {
				for (var attr in model.attributes) {
					if (model.attributes[attr] instanceof BackboneModel) {
						if (!this.attributes.hasOwnProperty(attr) || !(this.attributes[attr] instanceof BackboneModel) || !(this.attributes[attr] instanceof BackboneCollection)) {
							this.attributes[attr] = new Model(this.attributes[attr], {
								_parent: this,
								_relatedKey: attr
							});
						}
						this.attributes[attr].alias(model.attributes[attr]);
					}
				}
				this._alias = model;
				this.attributes.__proto__ = model.attributes;
				this.defaults = _.extend({}, model.defaults, this.defaults);
				this.relations = _.extend({}, model.relations, this.relations);
				this.computes = _.extend({}, model.computes, this.computes);
				return this;
			}
		});
		// statics
		_.extend(Model, {
			create: function create(attrs, protos, statics) {
				var protos = protos || {};
				var statics = statics || {};
				var defaults = _.extend({}, this.prototype.defaults, protos.defaults, attrs);
				var relations = _.extend({}, this.prototype.relations, protos.relations);
				var computes = _.extend({}, this.prototype.computes, protos.computes);
				for (var attr in attrs) {
					if (isPrototypeOf(attrs[attr], BackboneModel)) {
						relations[attr] = attrs[attr];
						defaults[attr] = {};
					} else if (isPrototypeOf(attrs[attr], BackboneCollection)) {
						relations[attr] = attrs[attr];
						defaults[attr] = [];
					} else if (attrs[attr] instanceof Compute) {
						computes[attr] = attrs[attr];
						delete defaults[attr];
					}
				}
				var ExtendedModel = this.extend(_.extend({}, protos, {
					defaults: defaults,
					relations: relations,
					computes: computes
				}), _.extend({}, statics, {
					create: Model.create,
					extend: Model.extend,
					define: Model.define
				}));
				ExtendedModel.Collection = Collection(ExtendedModel);
				return ExtendedModel;
			},
			extend: function extend() {
				return BackboneModel.extend.apply(this, arguments);
			}
		});

		Model.define = Model.create;

		return Model;
	}();

	/* --- Collection --- */
	Collection = B.Collection = function () {
		function Collection(models, options) {
			if (!(this instanceof Collection)) {
				if (isPrototypeOf(models, Collection)) return models.create.apply(models, _(arguments).slice(1));
				return Collection.create.apply(Collection, arguments);
			}
			_.extend(this, _.pick(options, '_parent', '_relatedKey'));
			this.on('update sort reset', this._triggerParentChange);
			BackboneCollection.apply(this, arguments);
		}

		Collection.prototype.__proto__ = BackboneCollection.prototype;

		// prototypes
		_.extend(Collection.prototype, {

			model: Model,

			subscribe: function subscribe(events, handler, context) {
				if (typeof events !== 'string') return;
				if (typeof handler !== 'function') return;
				var keys = events.split(/\s/);
				this.on('all', function (event) {
					if (keys.includes(event)) {
						handler.call(context);
					}
				});
			},


			_triggerParentChange: function _triggerParentChange(model, options) {
				var parent = this._parent;
				if (!parent) return;

				// If this change event is triggered by one of its child model
				if (model && model.collection) {
					var modelIndex = model.collection.indexOf(model);
					var modelID = model.id;

					parent.changed = {};
					_.extend(options, { chained: true });

					// Loop through every changed attributes of this model
					for (var key in model.changed) {
						if (!_.isUndefined(modelID)) {
							// Trigger "change:collection.id.child"
							parent.changed[this._relatedKey + '#' + modelID + '.' + key] = model.changed[key];
							parent.trigger('change:' + this._relatedKey + '#' + modelID + '.' + key, parent, model.changed[key], options);

							// Trigger "change:collection.child"
							parent.changed[this._relatedKey + '#' + modelID] = model.changed[key];
							parent.trigger('change:' + this._relatedKey + '#' + modelID, parent, model.changed[key], options);
						}

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
			},
			resetRelations: function resetRelations(options) {
				_.each(this.models, function (model) {
					_.each(model.relations, function (rel, key) {
						if (model.get(key) instanceof BackboneCollection) {
							model.get(key).trigger('reset', model, options);
						}
					});
				});
			},
			reset: function reset(models, options) {
				options || (options = {});
				for (var i = 0, l = this.models.length; i < l; i++) {
					this._removeReference(this.models[i]);
				}
				options.previousModels = this.models;
				this._reset();
				this.add(models, _.extend({ silent: true }, options));
				if (!options.silent) {
					this.trigger('reset', this, options);
					this.resetRelations(options);
				}
				return this;
			},
			comparator: function comparator(model) {
				return model.get('index');
			},
			toCompactJSON: function toCompactJSON() {
				var models = _(this.models).map(function (model) {
					return model instanceof BackboneModel ? model.toCompactJSON() : model.toJSON();
				});
				models.__proto__ = null;
				return models;
			},
			removeAt: function removeAt(index) {
				this.remove(this.at(index));
			},

			_prepareModel: function _prepareModel(attrs, options) {
				if (attrs instanceof Model) return attrs;
				options = options ? _.clone(options) : {};
				options.collection = this;

				var modelClass = this.model;
				if (attrs._rel && this.relations[attrs._rel]) modelClass = this.relations[attrs._rel];
				var model = new modelClass(attrs, options);
				if (!model.validationError) return model;
				this.trigger('invalid', this, model.validationError, options);
				return false;
			}
		});
		// statics
		_.extend(Collection, {
			create: function create(models, protos, statics) {
				var statics = _.extend({}, statics, {
					create: Collection.create,
					extend: Collection.extend,
					define: Collection.define
				});
				if (_.isArray(models) || isPrototypeOf(models, Model)) return Collection.extend(_.extend({}, protos, {
					model: _.isArray(models) ? models[0] : models
				}), statics);else if (_.isObject(models)) return Collection.extend(_.extend({}, protos, {
					relations: models
				}), statics);else return Collection.extend(protos, statics);
			},
			extend: function extend() {
				return BackboneCollection.extend.apply(this, arguments);
			}
		});

		Collection.define = Collection.create;

		return Collection;
	}();

	/* --- Utils --- */
	function getComputedValue(model, key) {
		if (model.computes && model.computes[key]) {
			var compute = model.computes[key];
			var deps = _(compute.deps).map(function (dep) {
				return model.get(dep);
			});
			return compute.get.apply(model, deps);
		}
		return model.attributes[key];
	}

	function isPrototypeOf(child, parent) {
		if (!child || !parent) return false;
		var result = false;
		var proto = child.prototype;
		while (proto) {
			if (proto == parent.prototype) {
				result = true;
				break;
			}
			proto = proto.__proto__;
		}
		return result;
	}

	return B;
});
