import _Model from './Model'
import _Collection from './Collection'

const _functions = require('lodash/functions')

const setPrototypeOf = Object.setPrototypeOf

const modelMethods = ['create', 'define', 'extend', 'watch', 'isValid']
const collectionMethods = ['define', 'extend', 'isValid']

function Model(...args) {
	if (!(this instanceof Model)) {
		return _Model.define(...args)
	}
	return new _Model(...args)
}

setPrototypeOf(Model.prototype, _Model.prototype)
modelMethods.forEach(name => {
	Model[name] = _Model[name].bind(_Model)
})

function Collection(...args) {
	if (!(this instanceof Collection)) {
		return _Collection.define(...args)
	}
	return new _Collection(...args)
}
setPrototypeOf(Collection.prototype, _Collection.prototype)
collectionMethods.forEach(name => {
	Collection[name] = _Collection[name].bind(_Collection)
})

export { Model, Collection, _Model, _Collection }
