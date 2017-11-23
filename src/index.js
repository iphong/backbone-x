import _Model from './Model'
import _Collection from './Collection'

export { _Model, _Collection }

export function Model(...args) {
	if (!(this instanceof Model)) {
		return _Model.define(...args)
	}
	return new _Model(...args)
}

Object.setPrototypeOf(Model.prototype, _Model.prototype)
Model.isValid = instance => instance instanceof _Model
Model.define = _Model.define.bind(_Model)
Model.create = _Model.create.bind(_Model)
Model.extend = _Model.extend.bind(_Model)
Model.watch = _Model.watch.bind(_Model)

export function Collection(...args) {
	if (!(this instanceof Collection)) {
		return _Collection.of(...args)
	}
	return new _Collection(...args)
}

Object.setPrototypeOf(Collection.prototype, _Collection.prototype)
Collection.isValid = instance => instance instanceof _Collection
Collection.of = _Collection.of.bind(_Collection)
Collection.extend = _Collection.extend.bind(_Collection)
