import _Model from './Model'
import _Collection from './Collection'

const _ = require('underscore')
const _set = require('lodash/set')
const _mapValues = require('lodash/mapValues')

// const Backbone = require('backbone')
// const _Model = Backbone.Model
// const _Collection = Backbone.Collection

const localStorage = global.localStorage

export function Compute(deps, options) {
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

export function Observable(attrs) {
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
	return new model({}).getProxy()
}

export function Model(attrs = {}, options = {}) {
	if (!(this instanceof Model)) {
		if (isPrototypeOf(attrs, Model))
			return attrs.create.apply(attrs, _(arguments).slice(1))
		return Model.create.apply(Model, arguments)
	}
	_Model.apply(this, arguments)
	// _.each(this.relations, function(ownerClass, attr) {
	// this.setRelation(attr, this.attributes[attr], { _parent: this })
	// }, this);
}

Object.setPrototypeOf(Model.prototype, _Model.prototype)

// statics
_.extend(Model, {
	..._.pick(_Model, 'extend', 'idAttribute', 'defaults', 'relations', 'computes'),
	create: function(attrs, protos = {}, statics = {}) {
		const defaults = _.extend({}, this.defaults, protos.defaults, attrs)
		const relations = _.extend({}, this.relations, protos.relations)
		const computes = _.extend({}, this.computes, protos.computes)
		_.each(attrs, (value, attr) => {
			if (isPrototypeOf(value, _Model)) {
				relations[attr] = value
				defaults[attr] = {}
			} else if (isPrototypeOf(value, _Collection)) {
				relations[attr] = value
				defaults[attr] = []
			} else if (attrs[attr] instanceof Compute) {
				computes[attr] = attrs[attr]
				delete defaults[attr]
			}
		})
		return this.extend(protos, {
			defaults,
			relations,
			computes
		})
	}
})

export function Collection(models, options) {
	if (!(this instanceof Collection)) {
		if (isPrototypeOf(models, Collection))
			return models.create.apply(models, _(arguments).slice(1))
		return Collection.create.apply(Collection, arguments)
	}
	_Collection.apply(this, arguments)
}

Object.setPrototypeOf(Collection.prototype, _Collection.prototype)

// statics
_.extend(Collection, {
	..._.pick(_Collection, 'model', 'extend'),
	create: function(models, protos, statics) {
		const Class = this.extend(protos, statics)
		Class.model = models
		return Class
	}
})

/* --- Utils --- */
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

const all = {
	Model,
	Collection,
	Observable,
	Compute
}

export default all
