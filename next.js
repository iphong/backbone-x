import Extended from './src/Extended'
import _each from 'lodash/each'
import _extend from 'lodash/extend'

export const Model = function ModelDefine(...args) {
	if (this instanceof ModelDefine) {
		return new Extended.Model(...args)
	} else {
		const [attrs, protos, statics] = args
		const defaults = {}
		const relations = {}
		const computes = {}
		_each(attrs, (value, key) => {
			if (
				value instanceof Extended.Model ||
				value instanceof Extended.Collection
			) {
				relations[key] = value
			} else {
				defaults[key] = value
			}
		})
		const Class = class extends Extended.Model {
			get defaults() {
				return defaults
			}
			get relations() {
				return relations
			}
		}
		statics && Object.defineProperties(
			Class,
			Object.getOwnPropertyDescriptors(statics)
		)
		protos && Object.defineProperties(
			Class.prototype,
			Object.getOwnPropertyDescriptors(protos)
		)
		return Class
	}
}
Model.prototype = Extended.Model.prototype
export const Collection = function CollectionDefine(...args) {
	let Class
	if (this instanceof CollectionDefine) {
		Class = new Extended.Collection(...args)
	} else {
		const [model, protos, statics] = args
		Class = class extends Extended.Collection {
			get model() {
				return model
			}
		}
		statics && Object.defineProperties(
			Class,
			Object.getOwnPropertyDescriptors(statics)
		)
		protos && Object.defineProperties(
			Class.prototype,
			Object.getOwnPropertyDescriptors(protos)
		)
		return Class
	}
}
Collection.prototype = Extended.Collection.prototype
