import sync from '../lib/sync'
import splice from '../lib/splice'
import events from '../lib/events'
import mixins from '../lib/mixins'
import { MODEL, COLLECTION, OBSERVER } from '../lib/defs'
import Model from './Model'

const _ = require('underscore')

const _extend = Object.assign
const slice = Array.prototype.slice
const setOptions = { add: true, remove: true, merge: true }
const addOptions = { add: true, remove: false }
const copyOptions = ['_parent', '_relatedKey', 'comparator']

@events
@mixins('models', {
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
})
class Collection {
	static define(model, prototypes, statics) {
		const Class = this.extend(prototypes, statics)
		Class.model = model
		return Class
	}
	static extend(prototypes, statics) {
		class C extends this {}
		Object.assign(C, statics, _.pick(prototypes, 'model'))
		Object.assign(C.prototype, _.omit(prototypes, 'model'))
		return C
	}
	static isValid(instance) {
		return instance instanceof Collection
	}
	// *[Symbol.iterator]() {
	// 	let i = 0
	// 	while (i < this.models.length) yield this.at(i++)
	// }

	constructor(models, options = {}) {
		this[OBSERVER] = this
		if (options.model) {
			Object.defineProperty(this, 'model', { value: options.model })
		}
		_extend(this, _.pick(options, copyOptions))
		this._reset()
		this.initialize.call(this, models, options)
		if (models) this.reset(models, _extend({ silent: true }, options))
		this.on('update reset sort', this._triggerParentChange)
	}

	get model() {
		return this.constructor.model
	}

	get proxy() {
		return this
	}

	// The default model for a collection is just a **Backbone.Model**.
	// This should be overridden in most cases.
	// Initialize is an empty function by default. Override it with your own
	// initialization logic.
	initialize() {}
	// The JSON representation of a Collection is an array of the
	// models' attributes.
	toJSON(options) {
		return this.map(function(model) {
			return model.toJSON(options)
		})
	}
	toCompactJSON() {
		const models = _(this.models).map(function(model) {
			return model instanceof Model
				? model.toCompactJSON()
				: model.toJSON()
		})
		return models
	}
	subscribe(type, handler, context) {
		if (typeof type !== 'string') return
		if (typeof handler !== 'function') return
		const keys = type.split(/\s/)
		this.on('all', event => {
			if (keys.includes(event)) {
				handler.call(context)
			}
		})
	}
	// Add a model, or list of models to the set. `models` may be Backbone
	// Models or raw JavaScript objects to be converted to Models, or any
	// combination of the two.
	add(models, options) {
		return this.set(models, _extend({ merge: false }, options, addOptions))
	}
	// Remove a model, or a list of models from the set.
	remove(models, options) {
		options = _extend({}, options)
		const singular = !_.isArray(models)
		models = singular ? [models] : models.slice()
		const removed = this._removeModels(models, options)
		if (!options.silent && removed.length) {
			options.changes = { added: [], merged: [], removed: removed }
			this.trigger('update', this, options)
		}
		return singular ? removed[0] : removed
	}

	removeAt(index) {
		this.remove(this.at(index))
	}
	// Update a collection by `set`-ing a new list of models, adding new ones,
	// removing models that are no longer present, and merging models that
	// already exist in the collection, as necessary. Similar to **Model#set**,
	// the core operation for updating the data contained by the collection.
	set(models, options) {
		if (models == null) return

		options = _extend({}, setOptions, options)
		if (options.parse && !this._isModel(models)) {
			models = this.parse(models, options) || []
		}

		const singular = !_.isArray(models)
		models = singular ? [models] : models.slice()

		let at = options.at
		if (at != null) at = +at
		if (at > this.length) at = this.length
		if (at < 0) at += this.length + 1

		const set = []
		const toAdd = []
		const toMerge = []
		const toRemove = []
		const modelMap = {}

		const add = options.add
		const merge = options.merge
		const remove = options.remove

		let sort = false
		const sortable = this.comparator && at == null && options.sort != false
		const sortAttr = _.isString(this.comparator) ? this.comparator : null

		// Turn bare objects into model references, and prevent invalid models
		// from being added.
		let model, i
		for (i = 0; i < models.length; i++) {
			model = models[i]

			// If a duplicate is found, prevent it from being added and
			// optionally merge it into the existing model.
			const existing = this.get(model)
			if (existing) {
				if (merge && model != existing) {
					let attrs = this._isModel(model) ? model.attributes : model
					if (options.parse) attrs = existing.parse(attrs, options)
					existing.set(attrs, options)
					toMerge.push(existing)
					if (sortable && !sort) sort = existing.hasChanged(sortAttr)
				}
				if (!modelMap[existing.cid]) {
					modelMap[existing.cid] = true
					set.push(existing)
				}
				models[i] = existing

				// If this is a new, valid model, push it to the `toAdd` list.
			} else if (add) {
				model = models[i] = this._prepareModel(model, options)
				if (model) {
					toAdd.push(model)
					this._addReference(model, options)
					modelMap[model.cid] = true
					set.push(model)
				}
			}
		}

		// Remove stale models.
		if (remove) {
			for (i = 0; i < this.length; i++) {
				model = this.models[i]
				if (!modelMap[model.cid]) toRemove.push(model)
			}
			if (toRemove.length) this._removeModels(toRemove, options)
		}

		// See if sorting is needed, update `length` and splice in new models.
		let orderChanged = false
		const replace = !sortable && add && remove
		if (set.length && replace) {
			orderChanged =
				this.length != set.length ||
				_.some(this.models, function(m, index) {
					return m != set[index]
				})
			this.models.length = 0
			splice(this.models, set, 0)
			this.length = this.models.length
		} else if (toAdd.length) {
			if (sortable) sort = true
			splice(this.models, toAdd, at == null ? this.length : at)
			this.length = this.models.length
		}

		// Silently sort the collection if appropriate.
		if (sort) this.sort({ silent: true })

		// Unless silenced, it's time to fire all appropriate add/sort/update events.
		if (!options.silent) {
			for (i = 0; i < toAdd.length; i++) {
				if (at != null) options.index = at + i
				model = toAdd[i]
				model.trigger('add', model, this, options)
			}
			if (sort || orderChanged) this.trigger('sort', this, options)
			if (toAdd.length || toRemove.length || toMerge.length) {
				options.changes = {
					added: toAdd,
					removed: toRemove,
					merged: toMerge
				}
				this.trigger('update', this, options)
			}
		}

		// Return the added (or merged) model (or models).
		return singular ? models[0] : models
	}
	// When you have more items than you want to add or remove individually,
	// you can reset the entire set with a new list of models, without firing
	// any granular `add` or `remove` events. Fires `reset` when finished.
	// Useful for bulk operations and optimizations.
	reset(models, options) {
		options || (options = {})
		for (let i = 0, l = this.models.length; i < l; i++) {
			this._removeReference(this.models[i])
		}
		options.previousModels = this.models
		this._reset()
		this.add(models, _extend({ silent: true }, options))
		if (!options.silent) {
			this.trigger('reset', this, options)
			this.resetRelations(options)
		}
		return this
	}
	// reset(models, options) {
	// 	options = options ? _.clone(options) : {}
	// 	for (let i = 0; i < this.models.length; i++) {
	// 		this._removeReference(this.models[i], options)
	// 	}
	// 	options.previousModels = this.models
	// 	this._reset()
	// 	models = this.add(models, _extend({ silent: true }, options))
	// 	if (!options.silent) this.trigger('reset', this, options)
	// 	return models
	// }

	resetRelations(options) {
		_.each(this.models, function(model) {
			_.each(model.relations, function(rel, key) {
				if (model.get(key) instanceof Collection) {
					model.get(key).trigger('reset', model, options)
				}
			})
		})
	}

	// Add a model to the end of the collection.
	push(model, options) {
		return this.add(model, _extend({ at: this.length }, options))
	}
	// Remove a model from the end of the collection.
	pop(options) {
		const model = this.at(this.length - 1)
		return this.remove(model, options)
	}
	// Add a model to the beginning of the collection.
	unshift(model, options) {
		return this.add(model, _extend({ at: 0 }, options))
	}
	// Remove a model from the beginning of the collection.
	shift(options) {
		const model = this.at(0)
		return this.remove(model, options)
	}
	// Slice out a sub-array of models from the collection.
	slice(...args) {
		return slice.apply(this.models, args)
	}
	// Get a model from the set by id, cid, model object with id or cid
	// properties, or an attributes object that is transformed through modelId.
	get(obj) {
		if (obj == null) return void 0
		return (
			this._byId[obj] ||
			this._byId[this.modelId(obj.attributes || obj)] ||
			(obj.cid && this._byId[obj.cid])
		)
	}
	// Returns `true` if the model is in the collection.
	has(obj) {
		return this.get(obj) != null
	}
	// Get the model at the given index.
	at(index) {
		if (index < 0) index += this.length
		return this.models[index]
	}
	// Return models with matching attributes. Useful for simple cases of
	// `filter`.
	where(attrs, first) {
		return this[first ? 'find' : 'filter'](attrs)
	}
	// Return the first model with matching attributes. Useful for simple cases
	// of `find`.
	findWhere(attrs) {
		return this.where(attrs, true)
	}
	// Force the collection to re-sort itself. You don't need to call this under
	// normal circumstances, as the set will maintain sort order as each item
	// is added.
	sort(options) {
		let comparator = this.comparator
		if (!comparator)
			throw new Error('Cannot sort a set without a comparator')
		options || (options = {})

		const length = comparator.length
		if (_.isFunction(comparator)) comparator = _.bind(comparator, this)

		// Run sort based on type of `comparator`.
		if (length == 1 || _.isString(comparator)) {
			this.models = this.sortBy(comparator)
		} else {
			this.models.sort(comparator)
		}
		if (!options.silent) this.trigger('sort', this, options)
		return this
	}
	// Pluck an attribute from each model in the collection.
	pluck(attr) {
		return this.map(`${attr}`)
	}
	// Fetch the default set of models for this collection, resetting the
	// collection when they arrive. If `reset: true` is passed, the response
	// data will be passed through the `reset` method instead of `set`.
	fetch(options) {
		options = _extend({ parse: true }, options)
		const success = options.success
		const error = options.error
		options.success = resp => {
			const method = options.reset ? 'reset' : 'set'
			this[method](resp, options)
			if (success) success.call(options.context, this, resp, options)
			this.trigger('sync', this, resp, options)
		}
		options.error = resp => {
			if (error) error.call(options.context, this, resp, options)
			this.trigger('error', this, resp, options)
		}
		return sync('read', this, options)
	}
	// Create a new instance of a model in this collection. Add the model to the
	// collection immediately, unless `wait: true` is passed, in which case we
	// wait for the server to agree.
	create(model, options) {
		options = options ? _.clone(options) : {}
		const wait = options.wait
		model = this._prepareModel(model, options)
		if (!model) return false
		if (!wait) this.add(model, options)
		const collection = this
		const success = options.success
		options.success = function(m, resp, callbackOpts) {
			if (wait) collection.add(m, callbackOpts)
			if (success)
				success.call(callbackOpts.context, m, resp, callbackOpts)
		}
		model.save(null, options)
		return model
	}
	// **parse** converts a response into a list of models to be added to the
	// collection. The default implementation is just to pass it through.
	parse(resp, options) {
		return resp
	}
	// Create a new collection with an identical list of models as this one.
	clone() {
		return new this.constructor(this.models, {
			model: this.model,
			comparator: this.comparator
		})
	}
	// Define how to uniquely identify models in the collection.
	modelId(attrs) {
		return attrs[this.model.prototype.idAttribute || 'id']
	}
	// Private method to reset all internal state. Called when the collection
	// is first initialized or reset.
	_reset() {
		this.length = 0
		this.models = []
		this._byId = {}
	}
	// Prepare a hash of attributes (or other model) to be added to this
	// collection.
	_prepareModel(attrs, options) {
		if (attrs instanceof Model) return attrs
		options = options ? _.clone(options) : {}
		options.collection = this

		const modelClass = this.model
		const model = new modelClass(attrs, options)
		if (!model.validationError) return model
		this.trigger('invalid', this, model.validationError, options)
		return false
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
	_removeModels(models, options) {
		const removed = []
		for (let i = 0; i < models.length; i++) {
			const model = this.get(models[i])
			if (!model) continue
			const index = this.indexOf(model)
			this.models.splice(index, 1)
			this.length--

			// Remove references before triggering 'remove' event to prevent an
			// infinite loop. #3693
			delete this._byId[model.cid]
			const id = this.modelId(model.attributes)
			if (id != null) delete this._byId[id]

			if (!options.silent) {
				options.index = index
				model.trigger('remove', model, this, options)
			}

			removed.push(model)
			this._removeReference(model, options)
		}
		return removed
	}
	// Method for checking whether an object should be considered a model for
	// the purposes of adding to the collection.
	_isModel(model) {
		return model instanceof Model
	}
	// Internal method to create a model's ties to a collection.
	_addReference(model, options) {
		this._byId[model.cid] = model
		const id = this.modelId(model.attributes)
		if (id != null) this._byId[id] = model
		model.on('all', this._onModelEvent, this)
	}
	// Internal method to sever a model's ties to a collection.
	_removeReference(model, options) {
		delete this._byId[model.cid]
		const id = this.modelId(model.attributes)
		if (id != null) delete this._byId[id]
		if (this === model.collection) delete model.collection
		model.off('all', this._onModelEvent, this)
	}
	// Internal method called every time a model in the set fires an event.
	// Sets need to update their indexes when models change ids. All other
	// events simply proxy through. "add" and "remove" events that originate
	// in other collections are ignored.
	_onModelEvent(...args) {
		const [event, model, collection, options] = args
		if (model) {
			if ((event === 'add' || event === 'remove') && collection !== this)
				return
			if (event === 'destroy') this.remove(model, options)
			if (event === 'change') {
				const prevId = this.modelId(model.previousAttributes())
				const id = this.modelId(model.attributes)
				if (prevId != id) {
					if (prevId != null) delete this._byId[prevId]
					if (id != null) this._byId[id] = model
				}
			}
		}
		this.trigger.apply(this, args)
	}

	_triggerParentChange(model, options) {
		const parent = this._parent
		if (!parent) return

		// If this change event is triggered by one of its child model
		if (model && model.collection) {
			const modelID = model.id

			parent.changed = {}
			_extend(options, { chained: true })

			// Loop through every changed attributes of this model
			for (const key in model.changed) {
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
	}
}

export default Collection