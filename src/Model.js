/**
 * Backbone Model
 *
 * -- rewritten in ES6
 * -- ported by Phong Vu
 */
import _defaults from 'lodash/defaultsDeep'
import Events from './Events'
import sync from '../lib/sync'
import addUnderscoreMethods from '../lib/addUnderscoreMethods'
const _ = require('underscore')

export default class Model extends Events {
	constructor(...args) {
		super()
		let [attrs, options] = args
		attrs = { ...attrs }
		options = { ...options }
		this.cid = _.uniqueId(this.cidPrefix)
		this.attributes = {}
		if (options.collection) this.collection = options.collection
		if (options.parse) attrs = this.parse(attrs, options) || {}
		const defaults = _.result(this, 'defaults')
		attrs = _defaults({}, attrs, defaults)
		this.set(attrs, options)
		this.changed = {}
		this.initialize(...args)
	}

	get idAttribute() {
		return 'id'
	}

	get cidPrefix() {
		return 'c'
	}

	get proxy() {
		return new Proxy(this, {
			collection: null,
			set(target, prop, val) {
				if (prop === 'collection') this.collection = val
				else target[prop] = val
				return true
			},
			get(target, prop) {
				if (prop === 'collection') return this.collection
				else return target[prop]
			}
		})
	}

	// Initialize is an empty function by default. Override it with your own
	// initialization logic.
	initialize() {}

	// Return a copy of the model's `attributes` object.
	toJSON(options) {
		return _.clone(this.attributes)
	}

	// Proxy `Backbone.sync` by default -- but override this if you need
	// custom syncing semantics for *this* particular model.
	sync(...args) {
		return sync.call(this, ...args)
	}

	// Get the value of an attribute.
	get(attr) {
		return this.attributes[attr]
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
		if (key == null) return this
		// Handle both `"key", value` and `{key: value}` -style arguments.
		let attrs
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
		const unset = options.unset
		const silent = options.silent
		const changes = []
		const changing = this._changing
		this._changing = true
		if (!changing) {
			this._previousAttributes = _.clone(this.attributes)
			this.changed = {}
		}
		const current = this.attributes
		const changed = this.changed
		const prev = this._previousAttributes
		// For each `set` attribute, update or delete the current value.
		for (const attr in attrs) {
			val = attrs[attr]
			if (!_.isEqual(current[attr], val)) changes.push(attr)
			if (!_.isEqual(prev[attr], val)) {
				changed[attr] = val
			} else {
				delete changed[attr]
			}
			unset ? delete current[attr] : (current[attr] = val)
		}
		// Update the `id`.
		if (this.idAttribute in attrs) this.id = this.get(this.idAttribute)
		// Trigger all relevant attribute changes.
		if (!silent) {
			if (changes.length) this._pending = options
			for (let i = 0; i < changes.length; i++) {
				this.trigger(
					`change:${changes[i]}`,
					this,
					current[changes[i]],
					options
				)
			}
		}
		// You might be wondering why there's a `while` loop here. Changes can
		// be recursively nested within `"change"` events.
		if (changing) return this
		if (!silent) {
			while (this._pending) {
				options = this._pending
				this._pending = false
				this.trigger('change', this, options)
			}
		}
		this._pending = false
		this._changing = false
		return this
	}

	// Remove an attribute from the model, firing `"change"`. `unset` is a noop
	// if the attribute doesn't exist.
	unset(attr, options) {
		return this.set(attr, void 0, _.extend({}, options, { unset: true }))
	}

	// Clear all attributes on the model, firing `"change"`.
	clear(options) {
		const attrs = {}
		for (const key in this.attributes) attrs[key] = void 0
		return this.set(attrs, _.extend({}, options, { unset: true }))
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
			if (_.isEqual(old[attr], val)) continue
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
		options = _.extend({ parse: true }, options)
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
		return this.sync('read', this, options)
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
		options = _.extend({ validate: true, parse: true }, options)
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
			if (wait) serverAttrs = _.extend({}, attrs, serverAttrs)
			if (serverAttrs && !model.set(serverAttrs, options)) return false
			if (success) success.call(options.context, model, resp, options)
			model.trigger('sync', model, resp, options)
		}
		wrapError(this, options)
		// Set temporary attributes if `{wait: true}` to properly find new ids.
		if (attrs && wait) this.attributes = _.extend({}, attributes, attrs)
		const method = this.isNew()
			? 'create'
			: options.patch ? 'patch' : 'update'
		if (method === 'patch' && !options.attrs) options.attrs = attrs
		const xhr = this.sync(method, this, options)
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
			xhr = this.sync('delete', this, options)
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
		return base.replace(/[^\/]$/, '$&/') + encodeURIComponent(id)
	}

	// **parse** converts a response into the hash of attributes to be `set` on
	// the model. The default implementation is just to pass the response along.
	parse(resp, options) {
		return resp
	}

	// Create a new model with identical attributes to this one.
	clone() {
		return new this.constructor(this.attributes)
	}

	// A model is new if it has never been saved to the server, and lacks an id.
	isNew() {
		return !this.has(this.idAttribute)
	}

	// Check if the model is currently in a valid state.
	isValid(options) {
		return this._validate({}, _.extend({}, options, { validate: true }))
	}

	// Run validation against the next complete set of model attributes,
	// returning `true` if all is well. Otherwise, fire an `"invalid"` event.
	_validate(attrs, options) {
		if (!options.validate || !this.validate) return true
		attrs = _.extend({}, this.attributes, attrs)
		const error = (this.validationError =
			this.validate(attrs, options) || null)
		if (!error) return true
		this.trigger(
			'invalid',
			this,
			error,
			_.extend(options, { validationError: error })
		)
		return false
	}
}

addUnderscoreMethods(
	Model,
	{
		keys: 1,
		values: 1,
		pairs: 1,
		invert: 1,
		pick: 0,
		omit: 0,
		chain: 1,
		isEmpty: 1
	},
	'attributes'
)

// Support `collection.sortBy('attr')` and `collection.findWhere({id: 1})`.
export function cb(iteratee, instance) {
	if (_.isFunction(iteratee)) return iteratee
	if (_.isObject(iteratee) && !instance._isModel(iteratee))
		return modelMatcher(iteratee)
	if (_.isString(iteratee))
		return function(model) {
			return model.get(iteratee)
		}
	return iteratee
}

export function modelMatcher(attrs) {
	const matcher = _.matches(attrs)
	return function(model) {
		return matcher(model.attributes)
	}
}

// Throw an error when a URL is needed, and none is supplied.
function urlError() {
	throw new Error('A "url" property or function must be specified')
}

// Wrap an optional error callback with a fallback error event.
function wrapError(model, options) {
	const error = options.error
	options.error = function(resp) {
		if (error) error.call(options.context, model, resp, options)
		model.trigger('error', model, resp, options)
	}
}
