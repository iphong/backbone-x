import _ from 'underscore'
import BackboneModel from './Model'
import BackboneCollection from './Collection'

class Model extends BackboneModel {
	constructor(attrs = {}, options = {}) {
		super(attrs, options)
		this._parent = options._parent
		_.each(this.relations, (ownerClass, attr) => {
			this.attributes[attr] = new ownerClass(this.attributes[attr], { _parent: this })
		})
	}
	get computes() {
		return {}
	}
	get relations() {
		return {}
	}
	get defaults() {
		return {}
	}
	get parent() {
		return this.collection || this._parent
	}
	get root() {
		let root = this
		let parent = this.collection || this._parent
		while (parent) {
			root = parent
			parent = parent.collection || parent._parent
		}
		return root
	}

	get(path = '') {
		const keys = `${path}`.split('.')
		const attr = keys.shift()
		let pointer
		if (attr in this.computes) {
			pointer = this.computes[attr].call(this, this)
		} else {
			pointer = this.attributes[attr]
		}
		while (keys.length && pointer) {
			const key = keys.shift()
			if (_.isFunction(pointer.get)) {
				pointer = pointer.get(key)
			} else if (_.isObject(pointer)) {
				pointer = pointer[key]
			} else {
				pointer = void 0
			}
		}
		return pointer
	}
	set(path, value, options, ...args) {
		if (_.isObject(path)) {
			return super.set(path, value)
		}
		const keys = path.split('.')
		const attr = keys.shift()
		if (attr in this.computes) {
			return this
		}
		if (!keys.length) {
			if (attr in this.relations) {
				if (_.isUndefined(this.attributes[attr])) {
					super.set(
						attr,
						new this.relations[attr](null, { _parent: this }),
						options
					)
				}
				return this.get(attr).set(value, options, ...args)
			} else {
				return super.set(attr, value, options)
			}
		}
		let pointer
		if (attr in this.attributes) {
			pointer = this.attributes[attr]
		} else {
			if (attr in this.relations) {
				super.set(
					attr,
					new this.relations[attr](null, { _parent: this }),
					options
				)
			} else {
				super.set(attr, {}, options)
			}
			pointer = this.get(attr)
		}
		while (keys.length && !_.isUndefined(pointer)) {
			let val
			const key = keys.shift()
			if (_.isObject(pointer)) {
				if (_.isFunction(pointer.get)) {
					val = pointer.get(key)
				} else {
					val = pointer[key]
				}
				if (_.isUndefined(val)) {
					val = keys.length ? {} : value
					if (_.isFunction(pointer.set)) {
						pointer.set(key, val)
					} else {
						pointer[key] = val
					}
				}
				pointer = val
			} else {
				pointer = void 0
			}
		}
		return this
	}
	clone(options) {
		return new this.constructor(this.toJSON())
	}
	clear(options) {
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
	}
	toJSON() {
		let attr,
			obj = {}
		const attrs = _.extend({}, this.attributes, this.computes)
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
	}
	toCompactJSON() {
		let attr,
			obj = Object.create(null, {})
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
	}
}

class Collection extends BackboneCollection {
	constructor(models = {}, options = {}) {
		super(models, options)
		this._parent = options._parent
		this.on('change', (event, ...args) => {
			this.parent && this.parent.trigger(event)
		})
	}
	get root() {
		let root = this
		let parent = this.collection || this._parent
		while (parent) {
			root = parent
			parent = parent.collection || parent._parent
		}
		return root
	}
	get parent() {
		return this._parent
	}
	toCompactJSON() {
		return this.models.map(function(model) {
			return (model.toCompactJSON || model.toJSON)()
		})
	}
}

export default { Model, Collection }