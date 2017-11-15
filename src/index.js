import _ from 'underscore'
// import BackboneModel from './Model'
// import BackboneCollection from './Collection'
import Backbone from 'backbone'
import _set from 'lodash/set'
import _mapValues from 'lodash/mapValues'

const BackboneModel = Backbone.Model
const BackboneCollection = Backbone.Collection

const localStorage = global.localStorage

function Compute(deps, options) {
	if (!(this instanceof Compute)) return new Compute(deps, options)
	if (_.isArray(deps) && _.isFunction(options))
		options = { deps: deps, get: options }
	else if (_.isFunction(deps)) options = _.defaults({ get: deps }, options)
	else options = deps || {}

	_.defaults(this, options, {
		deps: [],
		init: function() {
			return null
		},
		get: function(value) {
			return value
		},
		set: function(value) {
			return value
		}
	})
}

function Observable(attrs) {
	const map = obj => {
		return _.mapObject(obj, (value, key) => {
			if (Object.getPrototypeOf(value) === Object.prototype) {
				return Model(map(value))
			}
			if (_.isFunction(value)) {
				return Compute(value)
			}
			return value
		})
	}
	const model = Model(map(attrs))
	return (new model({})).proxy()
}

function Model(attrs = {}, options = {}) {
	if (!(this instanceof Model)) {
		if (isPrototypeOf(attrs, Model))
			return attrs.create.apply(attrs, _(arguments).slice(1))
		return Model.create.apply(Model, arguments)
	}
	const localStorageKey = options.localStorageKey
	options.localStorageKey = void 0
	_.extend(this, _.pick(options, '_parent', '_relatedKey'))
	_.each(this.computes, this._registerComputeValue, this)
	BackboneModel.apply(this, arguments)

	if (!_.isUndefined(localStorage) && !_.isUndefined(localStorageKey)) {
		const storedData = localStorage.getItem(localStorageKey)
		if (storedData) {
			try {
				this.set(JSON.parse(storedData))
			} catch (e) {
				console.warn(
					'Unable to restore from localStorage #(',
					localStorageKey,
					')'
				)
			}
		}
		this.on(
			'all',
			_.debounce(() => {
				localStorage.setItem(
					localStorageKey,
					JSON.stringify(this.toLocalStorageJSON())
				)
			}, 1000)
		)
	}
	// _.each(this.relations, function(ownerClass, attr) {
	// this.setRelation(attr, this.attributes[attr], { _parent: this })
	// }, this);
}

Object.setPrototypeOf(Model.prototype, BackboneModel.prototype)

// prototypes
_.extend(Model.prototype, {
	relations: {},
	computes: {},
	defaults: {},

	proxy() {
		return new Proxy(this.attributes, {
			has: (target, prop) => {
				return this.has(prop)
			},
			get: (target, prop) => {
				if (prop === '$model') return this
				const result = this.get(prop)
				if (result instanceof Model) return result.proxy()
				return result
			},
			set: (target, prop, value) => {
				this.set(prop, value)
				return true
			},
			getPrototypeOf: target => {
				return Object.getPrototypeOf(this)
			},
			setPrototypeOf(target, proto) {
				return true
			},
			deleteProperty: (target, prop) => {
				this.unset(prop)
				return true
			},
			defineProperty: (target, prop, descriptor) => {
				return true
			},
			ownKeys: target => {
				return this.keys()
			}
		})
	},

	subscribe(events, handler, context) {
		if (typeof events !== 'string') return
		if (typeof handler !== 'function') return
		const keys = events.split(/\s/)
		this.on('change', () => {
			const changes = Object.keys(this.changed)
			const matched = _.intersection(keys, changes).length
			if (matched) {
				handler.call(context)
			}
		})
	},

	get: function(key) {
		let value = this
		const regex = /(\w+)(?:#(\w+))?/g
		let match
		while ((match = regex.exec(key))) {
			value =
				value instanceof BackboneModel
					? getComputedValue(value, match[1])
					: typeof value === 'object' ? value[match[1]] : undefined
			if (match[2])
				value =
					value instanceof BackboneCollection
						? value.get(match[2])
						: value[match[2]]
		}
		return value
	},

	//
	// Borrowed from "Backbone Nested Models" by "Bret Little"
	//
	setRelation: function(attr, val, options) {
		let relation = this.attributes[attr],
			id = this.idAttribute || 'id',
			modelToSet,
			modelsToAdd = [],
			modelsToRemove = []

		if (options.unset && relation) delete relation.parent

		if (this.relations && _.has(this.relations, attr)) {
			// If the relation already exists, we don't want to replace it, rather
			// update the data within it whether it is a collection or model
			if (relation && relation instanceof Collection) {
				// If the val that is being set is already a collection, use the models
				// within the collection.
				if (val instanceof Collection || val instanceof Array) {
					val = val.models || val
					modelsToAdd = _.clone(val)

					relation.each(function(model, i) {
						// If the model does not have an "id" skip logic to detect if it already
						// exists and simply add it to the collection
						if (typeof model[id] === 'undefined') return

						// If the incoming model also exists within the existing collection,
						// call set on that model. If it doesn't exist in the incoming array,
						// then add it to a list that will be removed.
						const rModel = _.find(val, function(_model) {
							return _model[id] === model[id]
						})

						if (rModel) {
							model.set(rModel.toJSON ? rModel.toJSON() : rModel)

							// Remove the model from the incoming list because all remaining models
							// will be added to the relation
							modelsToAdd.splice(i, 1)
						} else {
							modelsToRemove.push(model)
						}
					})

					_.each(modelsToRemove, function(model) {
						relation.remove(model)
					})

					relation.add(modelsToAdd)
				} else {
					// The incoming val that is being set is not an array or collection, then it represents
					// a single model.  Go through each of the models in the existing relation and remove
					// all models that aren't the same as this one (by id). If it is the same, call set on that
					// model.

					relation.each(function(model) {
						if (val[id] === model[id]) {
							model.set(val)
						} else {
							relation.remove(model)
						}
					})
				}

				return relation
			}

			if (val instanceof Model) {
				val = val.toJSON()
			}

			if (relation && relation instanceof Model) {
				relation.set(val)
				return relation
			}

			options._parent = this
			options._relatedKey = attr

			val = new this.relations[attr](val, options)
			val.parent = this
		}

		return val
	},

	set: function(key, val, options) {
		if (typeof key === 'object') {
			options = val
			return this._set(key, options)
		}
		if (typeof key === 'string') {
			return this._set(_set({}, key, val), options)
		}
		// if (typeof key === 'string') {
		// 	if (!key.match(/[.\[]/)) return this._set(key, val, options)
		// 	const regex = /(\w+)(?:\[([0-9]+)\])?/
		// 	const keys = key.split('.')
		// 	const setAttr = keys.pop().match(regex)
		// 	const getAttr = keys.join('.')
		// 	if (!setAttr[2]) {
		// 		var setter = this.get(getAttr)
		// 		if (setter instanceof BackboneModel)
		// 			setter.set(setAttr[1], val, options)
		// 		else if (typeof setter === 'object') setter[setAttr[1]] = val
		// 		return this
		// 	}
		// 	const collection = this.get(`${getAttr}.${setAttr[1]}`)
		// 	if (collection instanceof BackboneCollection)
		// 		collection.at(parseInt(setAttr[2])).set(val, options)
		// 	else if (typeof setter === 'object')
		// 		collection[parseInt(setAttr[2])] = val
		// 	this.trigger(`change:${setAttr}`, this, options)
		// }
		return this
	},

	_set: function(key, val, options) {
		let attr, attrs, unset, changes, silent, changing, prev, current
		if (key == null) return this

		// Handle both `"key", value` and `{key: value}` -style arguments.
		if (typeof key === 'object') {
			attrs = key
			options = val
		} else {
			;(attrs = {})[key] = val
		}

		options || (options = {})

		// Run validation.
		if (!this._validate(attrs, options)) return false

		// Extract attributes and options.
		unset = options.unset
		silent = options.silent
		changes = []
		changing = this._changing
		this._changing = true

		if (!changing) {
			this._previousAttributes = _.clone(this.attributes)
			this.changed = {}
		}
		;(current = this.attributes), (prev = this._previousAttributes)

		// Check for changes of `id`.
		if (this.idAttribute in attrs) this.id = attrs[this.idAttribute]

		// For each `set` attribute, update or delete the current value.
		for (attr in attrs) {
			val = attrs[attr]
			if (this.computes[attr]) {
				val = this.computes[attr].set.call(this, val, options)
			} else {
				// Inject in the relational lookup
				val = this.setRelation(attr, val, options)
			}
			if (_.isUndefined(val)) continue

			if (current[attr] !== val) changes.push(attr)
			if (prev[attr] !== val) {
				this.changed[attr] = val
			} else {
				delete this.changed[attr]
			}
			unset ? delete current[attr] : (current[attr] = val)
		}

		// Trigger all relevant attribute changes.
		if (!silent) {
			if (changes.length) this._pending = true
			for (let i = 0, l = changes.length; i < l; i++) {
				this.trigger(
					`change:${changes[i]}`,
					this,
					current[changes[i]],
					options
				)
			}
		}

		if (changing) return this
		if (!silent) {
			while (this._pending) {
				this._pending = false
				this.trigger('change', this, options)
				this._triggerParentChange(options)
			}
		}
		this._pending = false
		this._changing = false
		return this
	},

	clone: function(options) {
		return new this.constructor(this.toJSON())
	},

	clear: function(options) {
		const attrs = {}
		for (const key in this.attributes) {
			if (this.attributes[key] instanceof BackboneModel)
				this.attributes[key].clear(options)
			else if (this.attributes[key] instanceof BackboneCollection)
				this.attributes[key].invoke('clear', options), this.attributes[
					key
				].reset([])
			else attrs[key] = void 0
		}
		return this.set(attrs, _.extend({}, options, { unset: true }))
	},

	toJSON2: function(options) {
		const attrs = _.clone(this.attributes)

		_.each(this.relations, function(rel, key) {
			if (_.has(attrs, key)) {
				attrs[key] = attrs[key].toJSON()
			} else {
				attrs[key] = new rel().toJSON()
			}
		})

		return attrs
	},

	toLocalStorageJSON() {
		return _mapValues(this.attributes, value => {
			if (
				typeof value === 'string' ||
				typeof value === 'number' ||
				typeof value === 'boolean'
			) {
				return value
			}
			if (value && typeof value === 'object') {
				const proto = Object.getPrototypeOf(value)
				if (proto === Array.prototype || proto === Object.prototype) {
					return value
				}
			}
			if (value instanceof Model) {
				return value.toLocalStorageJSON()
			}
			return void 0
		})
	},

	toJSON: function() {
		let attr
		const obj = {}
		const attrs = _.extend({}, this.attributes)
		for (const key in attrs) {
			attr = this.get(key)
			if (
				attr instanceof BackboneModel ||
				attr instanceof BackboneCollection
			)
				attr = attr.toJSON()
			else if (_.isObject(attr)) attr = _.clone(attr)
			obj[key] = attr
		}
		return obj
	},

	toCompactJSON: function() {
		let attr,
			obj = {}
		for (const key in this.attributes) {
			if (this.attributes.hasOwnProperty(key)) {
				attr = this.attributes[key]
				if (attr instanceof Model || attr instanceof Collection)
					attr = attr.toCompactJSON()
				else if (
					attr instanceof BackboneModel ||
					attr instanceof BackboneCollection
				)
					attr = attr.toJSON()

				if (attr instanceof Compute) continue
				if (_.isEqual(attr, this.defaults[key])) continue

				obj[key] = attr
			}
		}
		return obj
	},

	_triggerParentChange: function(options) {
		const parent = this.collection || this._parent
		if (!parent) return

		parent.changed = {}
		_.extend(options, { chained: true })

		// Loop through every changed attribute
		for (const key in this.changed) {
			// Trigger "change:this.attr"
			parent.changed[`${this._relatedKey}.${key}`] = this.changed[key]
			parent.trigger(
				`change:${this._relatedKey}.${key}`,
				parent,
				this.changed[key],
				options
			)
		}
		//parent.changed[ this._relatedKey ] = this;
		parent.changed[this._relatedKey] = undefined

		parent.trigger(`change:${this._relatedKey}`, parent, this, options)
		parent.trigger('change', parent, options)
		if (this.collection) {
			_.defer(
				function() {
					parent._triggerParentChange(this, options)
				}.bind(this)
			)
		} else {
			parent._triggerParentChange(options)
		}
	},

	_registerComputeValue: function(compute, attr) {
		_.each(
			compute.deps,
			function(depAttr) {
				this.on(`change:${depAttr}`, function(model, value, options) {
					var value = model.get(depAttr)
					if (
						value instanceof BackboneModel ||
						value instanceof Collection
					) {
						model.changed[attr] = undefined
						_.each(value.changed, function(subValue, subAttr) {
							model.changed[subAttr] = subValue
							model.trigger(
								`change:${attr}.${subAttr}`,
								model,
								subValue,
								options
							)
						})
					} else {
						model.changed[attr] = value
					}
					model.trigger(`change:${attr}`, model, value, options)
					model.trigger('change', model, options)
				})
			},
			this
		)
	}
})

// statics
_.extend(Model, {
	create: function(attrs, protos, statics) {
		var protos = protos || {}
		var statics = statics || {}
		const defaults = _.extend(
			{},
			this.prototype.defaults,
			protos.defaults,
			attrs
		)
		const relations = _.extend(
			{},
			this.prototype.relations,
			protos.relations
		)
		const computes = _.extend({}, this.prototype.computes, protos.computes)
		for (const attr in attrs) {
			if (isPrototypeOf(attrs[attr], BackboneModel)) {
				relations[attr] = attrs[attr]
				defaults[attr] = {}
			} else if (isPrototypeOf(attrs[attr], BackboneCollection)) {
				relations[attr] = attrs[attr]
				defaults[attr] = []
			} else if (attrs[attr] instanceof Compute) {
				computes[attr] = attrs[attr]
				delete defaults[attr]
			}
		}
		const ExtendedModel = this.extend(
			_.extend({}, protos, {
				defaults: defaults,
				relations: relations,
				computes: computes
			}),
			_.extend({}, statics, {
				create: Model.create,
				extend: Model.extend,
				define: Model.define
			})
		)
		ExtendedModel.Collection = Collection(ExtendedModel)
		return ExtendedModel
	},

	extend: function() {
		return BackboneModel.extend.apply(this, arguments)
	}
})

Model.define = Model.create

function Collection(models, options) {
	if (!(this instanceof Collection)) {
		if (isPrototypeOf(models, Collection))
			return models.create.apply(models, _(arguments).slice(1))
		return Collection.create.apply(Collection, arguments)
	}
	_.extend(this, _.pick(options, '_parent', '_relatedKey'))
	this.on('update sort reset', this._triggerParentChange)
	BackboneCollection.apply(this, arguments)
}

Object.setPrototypeOf(Collection.prototype, BackboneCollection.prototype)

// prototypes
_.extend(Collection.prototype, {
	model: Model,

	subscribe(events, handler, context) {
		if (typeof events !== 'string') return
		if (typeof handler !== 'function') return
		const keys = events.split(/\s/)
		this.on('all', event => {
			if (keys.includes(event)) {
				handler.call(context)
			}
		})
	},

	_triggerParentChange: function(model, options) {
		const parent = this._parent
		if (!parent) return

		// If this change event is triggered by one of its child model
		if (model && model.collection) {
			const modelIndex = model.collection.indexOf(model)
			const modelID = model.id

			parent.changed = {}
			_.extend(options, { chained: true })

			// Loop through every changed attributes of this model
			for (const key in model.changed) {
				if (!_.isUndefined(modelID)) {
					// Trigger "change:collection.id.child"
					parent.changed[`${this._relatedKey}#${modelID}.${key}`] =
						model.changed[key]
					parent.trigger(
						`change:${this._relatedKey}#${modelID}.${key}`,
						parent,
						model.changed[key],
						options
					)

					// Trigger "change:collection.child"
					parent.changed[`${this._relatedKey}#${modelID}`] =
						model.changed[key]
					parent.trigger(
						`change:${this._relatedKey}#${modelID}`,
						parent,
						model.changed[key],
						options
					)
				}

				// Trigger "change:collection.child"
				parent.changed[`${this._relatedKey}.${key}`] =
					model.changed[key]
				parent.trigger(
					`change:${this._relatedKey}.${key}`,
					parent,
					model.changed[key],
					options
				)
			}

			// Trigger "change:collection"
			parent.changed[this._relatedKey] = this
			parent.trigger(`change:${this._relatedKey}`, parent, options)
			parent._triggerParentChange(options)
		}

		parent.changed[this._relatedKey] = this

		// Finally trigger "change"
		parent.trigger('change', parent, options)
	},

	resetRelations: function(options) {
		_.each(this.models, function(model) {
			_.each(model.relations, function(rel, key) {
				if (model.get(key) instanceof BackboneCollection) {
					model.get(key).trigger('reset', model, options)
				}
			})
		})
	},

	reset: function(models, options) {
		options || (options = {})
		for (let i = 0, l = this.models.length; i < l; i++) {
			this._removeReference(this.models[i])
		}
		options.previousModels = this.models
		this._reset()
		this.add(models, _.extend({ silent: true }, options))
		if (!options.silent) {
			this.trigger('reset', this, options)
			this.resetRelations(options)
		}
		return this
	},

	comparator: function(model) {
		return model.get('index')
	},

	toCompactJSON: function() {
		const models = _(this.models).map(function(model) {
			return model instanceof BackboneModel
				? model.toCompactJSON()
				: model.toJSON()
		})
		return models
	},

	removeAt(index) {
		this.remove(this.at(index))
	},

	_prepareModel: function(attrs, options) {
		if (attrs instanceof Model) return attrs
		options = options ? _.clone(options) : {}
		options.collection = this

		let modelClass = this.model
		if (attrs._rel && this.relations[attrs._rel])
			modelClass = this.relations[attrs._rel]
		const model = new modelClass(attrs, options)
		if (!model.validationError) return model
		this.trigger('invalid', this, model.validationError, options)
		return false
	}
})

// statics
_.extend(Collection, {
	create: function(models, protos, statics) {
		var statics = _.extend({}, statics, {
			create: Collection.create,
			extend: Collection.extend,
			define: Collection.define
		})
		if (_.isArray(models) || isPrototypeOf(models, Model))
			return Collection.extend(
				_.extend({}, protos, {
					model: _.isArray(models) ? models[0] : models
				}),
				statics
			)
		else if (_.isObject(models))
			return Collection.extend(
				_.extend({}, protos, {
					relations: models
				}),
				statics
			)
		else return Collection.extend(protos, statics)
	},
	extend: function() {
		return BackboneCollection.extend.apply(this, arguments)
	}
})

Collection.define = Collection.create

/* --- Utils --- */
function getComputedValue(model, key) {
	if (model.computes && model.computes[key]) {
		const compute = model.computes[key]
		const deps = _(compute.deps).map(function(dep) {
			return model.get(dep)
		})
		return compute.get.apply(model, deps)
	}
	return model.attributes[key]
}

function setPrototypeOf(child, prototype) {
	if (_.isFunction(Object.setPrototypeOf))
		Object.setPrototypeOf(child.prototype || child, prototype)
	else (child.prototype || child).__proto__ = prototype
	return child
}

function isPrototypeOf(child, parent) {
	if (!child || !parent) return false
	let result = false
	let proto = child.prototype
	while (proto) {
		if (proto == parent.prototype) {
			result = true
			break
		}
		proto = proto.__proto__
	}
	return result
}

function optimizeCb(func, context, argCount) {
	if (context === void 0) return func
	switch (argCount == null ? 3 : argCount) {
		case 1:
			return function(value) {
				return func.call(context, value)
			}
		case 2:
			return function(value, other) {
				return func.call(context, value, other)
			}
		case 3:
			return function(value, index, collection) {
				return func.call(context, value, index, collection)
			}
		case 4:
			return function(accumulator, value, index, collection) {
				return func.call(context, accumulator, value, index, collection)
			}
	}
	return function() {
		return func.apply(context, arguments)
	}
}

function cb(value, context, argCount) {
	if (value == null) return _.identity
	if (_.isFunction(value)) return optimizeCb(value, context, argCount)
	if (_.isObject(value)) return _.matcher(value)
	return _.property(value)
}

exports.Model = Model
exports.Compute = Compute
exports.Collection = Collection
exports.Observable = Observable
exports.AUTHOR = 'Phong Vu'
