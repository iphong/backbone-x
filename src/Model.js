/**
 * Backbone Model
 *
 * -- rewritten in ES6
 * -- ported by Phong Vu
 */
import sync from '../lib/sync'
import mixins from '../lib/mixins'
import events from '../lib/events'
import { MODEL, COLLECTION, OBSERVER } from '../lib/defs'

import Collection from './Collection'

const _ = require('underscore')
const _set = require('lodash/set')
const _get = require('lodash/get')
const _mapValues = require('lodash/mapValues')
const _cloneDeep = require('lodash/cloneDeep')

const _assign = Object.assign

const localStorage = global.localStorage
const copyOptions = ['collection', '_parent', '_relatedKey']
const copyProtos = ['idAttribute', 'defaults', 'relations', 'computes']

@events
@mixins('attributes', {
	keys: 1,
	values: 1,
	pairs: 1,
	invert: 1,
	pick: 0,
	omit: 0,
	chain: 1,
	isEmpty: 1
})
class Model {
	static cidPrefix = 'c'
	static relations = {}
	static computes = {}
	static defaults = {}

	static create(props, options) {
		const Class = this.define(props)
		const model = new Class({}, options)
		return model.proxy
	}
	static define(shape, protos = {}, statics = {}) {
		switch (typeof shape) {
			case 'object':
				const defaults = { ...protos.defaults }
				const computes = { ...protos.computes }
				const relations = { ...protos.relations }
				Object.getOwnPropertyNames(shape).forEach(key => {
					const prop = Object.getOwnPropertyDescriptor(shape, key)
					if (prop.value) {
						switch (typeof prop.value) {
							case 'function':
								if (
									prop.value.prototype instanceof Model ||
									prop.value.prototype instanceof Collection
								) {
									relations[key] = prop.value
									defaults[key] = relations[key].defaults
								}
								break
							case 'object':
								if (!Array.isArray(prop.value)) {
									relations[key] = Model.define(prop.value)
									defaults[key] = relations[key].defaults
									break
								}
							default:
								defaults[key] = prop.value
						}
					} else if (prop.get || prop.set) {
						computes[key] = _.pick(prop, 'get', 'set')
					}
				})
				return this.extend(protos, {
					defaults,
					computes,
					relations,
					...statics
				})
			default:
				return this
		}
	}
	static extend(prototypes, statics) {
		class M extends this {}
		_assign(M, statics, _.pick(prototypes, copyProtos))
		_assign(M.prototype, _.omit(prototypes, copyProtos))
		return M
	}
	static watch(proxy, ...args) {
		const observer = proxy[OBSERVER]
		if (observer) {
			observer.on(...args)
		}
	}
	static isValid(instance) {
		return instance instanceof Model
	}

	constructor(attributes, options) {
		let attrs = attributes || {}
		options || (options = {})
		this.cid = _.uniqueId(this.cidPrefix)
		this.attributes = {}
		_assign(this, _.pick(options, copyOptions))
		if (options.parse) attrs = this.parse(attrs, options) || {}
		const defaults = _.result(this, 'defaults')
		attrs = _.defaults(_assign({}, defaults, attrs), defaults)
		this.set(attrs, options)
		this.changed = {}
		this._createProxy()
		this._initLocalStorage(options)
		this.initialize.call(this, attributes, options)
	}

	get defaults() {
		return this.constructor.defaults
	}

	get relations() {
		return this.constructor.relations
	}

	get computes() {
		return this.constructor.computes
	}

	get idAttribute() {
		return this.constructor.idAttribute
	}

	// Initialize is an empty function by default. Override it with your own
	// initialization logic.
	initialize() {}

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
	}

	// Return a copy of the model's `attributes` object.
	toJSON() {
		let attr
		const obj = {}
		const attrs = _assign({}, this.attributes)
		for (const key in attrs) {
			attr = this.get(key)
			if (_.isObject(attr)) {
				if (attr instanceof Model || attr instanceof Collection) {
					attr = (attr[OBSERVER] || attr).toJSON()
				} else {
					const proto = Object.getPrototypeOf(attr)
					if (
						proto === Array.prototype ||
						proto === Object.prototype
					) {
						attr = _.clone(attr)
					} else {
						attr = void 0
					}
				}
			}
			if (!_.isUndefined(attr)) {
				obj[key] = attr
			}
		}
		return obj
	}

	toCompactJSON() {
		let attr
		const obj = {}
		for (const key in this.attributes) {
			if (this.attributes.hasOwnProperty(key)) {
				attr = this.attributes[key]
				if (typeof attr.toCompactJSON === 'function') {
					attr = attr.toCompactJSON()
				} else if (typeof attr.toJSON === 'function') {
					attr = attr.toJSON()
				}
				if (_.isEqual(attr, this.defaults[key])) continue

				obj[key] = attr
			}
		}
		return obj
	}

	// Get the value of an attribute.
	get(key) {
		if (typeof key !== 'string') return void 0
		let match
		let value = this
		const regex = /(\w+)(?:#(\w+))?/g
		while ((match = regex.exec(key))) {
			const [, m1, m2] = match
			if (value === this) {
				if (m1 in value.computes) {
					value = _get(value.computes[m1], 'get')
				} else {
					value = _get(value.attributes, m1)
				}
				if (typeof value === 'function') {
					value = value.call(this.proxy)
				}
			} else if (value instanceof Model) {
				value = value.get(m1)
			} else if (value instanceof Object) {
				value = value[m1]
			} else {
				value = void 0
			}
			if (m2) {
				if (Collection.isValid(value)) {
					value = value.at(m2)
				} else if (value instanceof Object) {
					value = value[m2]
				} else {
					value = void 0
				}
			}
		}
		return value
	}

	// Get the HTML-escaped value of an attribute.
	escape(attr) {
		return _.escape(this.get(attr))
	}

	// Returns `true` if the attribute contains a value that is not null
	// or undefined.
	has(attr) {
		return this.get(attr) != null
	}

	// Special-cased proxy to underscore's `_.matches` method.
	matches(attrs) {
		return !!_.iteratee(attrs, this)(this.attributes)
	}

	// Set a hash of model attributes on the object, firing `"change"`. This is
	// the core primitive operation of a model, updating the data and notifying
	// anyone who needs to know about the change in state. The heart of the beast.
	set(key, val, options) {
		let attrs, prev, current
		if (key == null) return this

		// Handle both `"key", value` and `{key: value}` -style arguments.
		if (typeof key === 'object') {
			attrs = key
			options = val
		} else {
			attrs = _set({}, key, val)
		}

		options || (options = {})

		// Run validation.
		if (!this._validate(attrs, options)) return false

		// Extract attributes and options.
		const unset = options.unset
		const silent = options.silent
		const changes = []
		const changing = this._changing
		this._changing = true

		if (!changing) {
			this._previousAttributes = _.clone(this.attributes)
			this.changed = {}
		}
		;(current = this.attributes), (prev = this._previousAttributes)

		// Check for changes of `id`.
		if (this.idAttribute in attrs) this.id = attrs[this.idAttribute]

		// For each `set` attribute, update or delete the current value.
		Object.keys(attrs).forEach(attr => {
			let value = attrs[attr]
			if (attr in this.computes) {
				value = _get(this.computes[attr], 'set')
				if (typeof value === 'function') {
					value = value.call(this.proxy, val)
				} else {
					value = void 0
				}
			} else {
				value = this.setRelation(attr, value, options)
			}
			if (!_.isUndefined(value) && !_.isFunction(value)) {
				if (current[attr] !== value) changes.push(attr)
				if (prev[attr] !== value) {
					this.changed[attr] = value
				} else {
					delete this.changed[attr]
				}
				unset ? delete current[attr] : (current[attr] = value)
			}
		})

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
	}
	//
	// Borrowed from "Backbone Nested Models" by "Bret Little"
	//
	setRelation(attr, val, options) {
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
				// If the value that is being set is already a collection, use the models
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
	}

	// Remove an attribute from the model, firing `"change"`. `unset` is a noop
	// if the attribute doesn't exist.
	unset(attr, options) {
		return this.set(attr, void 0, _assign({}, options, { unset: true }))
	}

	// Clear all attributes on the model, firing `"change"`.
	clear(options) {
		const attrs = {}
		for (const key in this.attributes) {
			if (this.attributes[key] instanceof Model)
				this.attributes[key].clear(options)
			else if (Collection.isValid(this.attributes[key]))
				this.attributes[key].invoke('clear', options), this.attributes[
					key
				].reset([])
			else attrs[key] = void 0
		}
		return this.set(attrs, _assign({}, options, { unset: true }))
	}

	// Determine if the model has changed since the last `"change"` event.
	// If you specify an attribute name, determine if that attribute has changed.
	hasChanged(attr) {
		if (attr == null) return !_.isEmpty(this.changed)
		return _.has(this.changed, attr)
	}

	// Return an object containing all the attributes that have changed, or
	// false if there are no changed attributes. Useful for determining what
	// parts of a view need to be updated and/or what attributes need to be
	// persisted to the server. Unset attributes will be set to undefined.
	// You can also pass an attributes object to diff against the model,
	// determining if there *would be* a change.
	changedAttributes(diff) {
		if (!diff) return this.hasChanged() ? _.clone(this.changed) : false
		const old = this._changing ? this._previousAttributes : this.attributes
		const changed = {}
		for (const attr in diff) {
			const val = diff[attr]
			if (old[attr] === val) continue
			changed[attr] = val
		}
		return _.size(changed) ? changed : false
	}

	// Get the previous value of an attribute, recorded at the time the last
	// `"change"` event was fired.
	previous(attr) {
		if (attr == null || !this._previousAttributes) return null
		return this._previousAttributes[attr]
	}

	// Get all of the attributes of the model at the time of the previous
	// `"change"` event.
	previousAttributes() {
		return _.clone(this._previousAttributes)
	}

	// Fetch the model from the server, merging the response with the model's
	// local attributes. Any changed attributes will trigger a "change" event.
	fetch(options) {
		options = _assign({ parse: true }, options)
		const model = this
		const success = options.success
		options.success = function(resp) {
			const serverAttrs = options.parse
				? model.parse(resp, options)
				: resp
			if (!model.set(serverAttrs, options)) return false
			if (success) success.call(options.context, model, resp, options)
			model.trigger('sync', model, resp, options)
		}
		wrapError(this, options)
		return sync('read', this, options)
	}

	// Set a hash of model attributes, and sync the model to the server.
	// If the server returns an attributes hash that differs, the model's
	// state will be `set` again.
	save(key, val, options) {
		// Handle both `"key", value` and `{key: value}` -style arguments.
		let attrs
		if (key == null || typeof key === 'object') {
			attrs = key
			options = val
		} else {
			;(attrs = {})[key] = val
		}
		options = _assign({ validate: true, parse: true }, options)
		const wait = options.wait
		// If we're not waiting and attributes exist, save acts as
		// `set(attr).save(null, opts)` with validation. Otherwise, check if
		// the model will be valid when the attributes, if any, are set.
		if (attrs && !wait) {
			if (!this.set(attrs, options)) return false
		} else if (!this._validate(attrs, options)) {
			return false
		}
		// After a successful server-side save, the client is (optionally)
		// updated with the server-side state.
		const model = this
		const success = options.success
		const attributes = this.attributes
		options.success = function(resp) {
			// Ensure attributes are restored during synchronous saves.
			model.attributes = attributes
			let serverAttrs = options.parse ? model.parse(resp, options) : resp
			if (wait) serverAttrs = _assign({}, attrs, serverAttrs)
			if (serverAttrs && !model.set(serverAttrs, options)) return false
			if (success) success.call(options.context, model, resp, options)
			model.trigger('sync', model, resp, options)
		}
		wrapError(this, options)
		// Set temporary attributes if `{wait: true}` to properly find new ids.
		if (attrs && wait) this.attributes = _assign({}, attributes, attrs)
		const method = this.isNew()
			? 'create'
			: options.patch ? 'patch' : 'update'
		if (method === 'patch' && !options.attrs) options.attrs = attrs
		const xhr = sync(method, this, options)
		// Restore attributes.
		this.attributes = attributes
		return xhr
	}

	// Destroy this model on the server if it was already persisted.
	// Optimistically removes the model from its collection, if it has one.
	// If `wait: true` is passed, waits for the server to respond before removal.
	destroy(options) {
		options = options ? _.clone(options) : {}
		const model = this
		const success = options.success
		const wait = options.wait
		const destroy = function() {
			model.stopListening()
			model.trigger('destroy', model, model.collection, options)
		}
		options.success = function(resp) {
			if (wait) destroy()
			if (success) success.call(options.context, model, resp, options)
			if (!model.isNew()) model.trigger('sync', model, resp, options)
		}
		let xhr = false
		if (this.isNew()) {
			_.defer(options.success)
		} else {
			wrapError(this, options)
			xhr = sync('delete', this, options)
		}
		if (!wait) destroy()
		return xhr
	}

	// Default URL for the model's representation on the server -- if you're
	// using Backbone's restful methods, override this to change the endpoint
	// that will be called.
	url() {
		const base =
			_.result(this, 'urlRoot') ||
			_.result(this.collection, 'url') ||
			urlError()
		if (this.isNew()) return base
		const id = this.get(this.idAttribute)
		return base.replace(/[^/]$/, '$&/') + encodeURIComponent(id)
	}

	// **parse** converts a response into the hash of attributes to be `set` on
	// the model. The default implementation is just to pass the response along.
	parse(resp, options) {
		return resp
	}

	// Create a new model with identical attributes to this one.
	clone(options) {
		return new this.constructor(this.toJSON())
	}

	// A model is new if it has never been saved to the server, and lacks an id.
	isNew() {
		return !this.has(this.idAttribute)
	}

	// Check if the model is currently in a valid state.
	isValid(options) {
		return this._validate({}, _assign({}, options, { validate: true }))
	}

	// Run validation against the next complete set of model attributes,
	// returning `true` if all is well. Otherwise, fire an `"invalid"` event.
	_validate(attrs, options) {
		if (!options.validate || !this.validate) return true
		attrs = _assign({}, this.attributes, attrs)
		const error = (this.validationError =
			this.validate(attrs, options) || null)
		if (!error) return true
		this.trigger(
			'invalid',
			this,
			error,
			_assign(options, { validationError: error })
		)
		return false
	}

	_createProxy() {
		if (this.proxy) return
		this.proxy = new Proxy(this, {
			has: (target, prop) => {
				return target.has(prop)
			},
			get: (target, prop) => {
				switch (prop) {
					case '$':
					case OBSERVER:
						return this
					default:
						const result = target.get(prop)
						if (result instanceof Model) return result.proxy
						return result
				}
			},
			set: (target, prop, value) => {
				target.set(prop, value)
				return true
			},
			getPrototypeOf: target => {
				return Object.getPrototypeOf(this)
			},
			setPrototypeOf(target, proto) {
				return true
			},
			deleteProperty: (target, prop) => {
				target.unset(prop)
				return true
			},
			defineProperty: (target, prop, descriptor) => {
				return true
			},
			ownKeys: target => {
				return target.keys()
			}
		})
	}

	_initLocalStorage(options) {
		const localStorageKey = options.localStorageKey
		delete options.localStorageKey
		if (localStorage && localStorageKey) {
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
						JSON.stringify(this.toJSON())
					)
				}, 1000)
			)
		}
	}

	_triggerParentChange(options) {
		const parent = this.collection || this._parent
		if (!parent) return
		const relatedKey = this._relatedKey || this.id
		_assign({}, options, { chained: true })

		parent.changed = {}

		if (relatedKey != null) {
			// Loop through every changed attribute
			for (const key in this.changed) {
				parent.changed[`${relatedKey}.${key}`] = this.changed[key]
				parent.trigger(
					`change:${relatedKey}.${key}`,
					parent,
					this.changed[key],
					options
				)
			}
			parent.changed[relatedKey] = undefined
			parent.trigger(`change:${relatedKey}`, parent, this, options)
		}
		if (this.collection) {
			parent._triggerParentChange(this, options)
		} else {
			parent.trigger('change', parent, options)
			parent._triggerParentChange(options)
		}
	}
}

Collection.model = Model

// Throw an error when a URL is needed, and none is supplied.
function urlError() {
	console.warn('A "url" property or function must be specified')
}

// Wrap an optional error callback with a fallback error event.
function wrapError(model, options) {
	const error = options.error
	options.error = function(resp) {
		if (error) error.call(options.context, model, resp, options)
		model.trigger('error', model, resp, options)
	}
}

export default Model
