const _ = require('underscore')

const slice = Array.prototype.slice

export default function(attribute, methods) {
	return Class => {
		_.each(methods, function(length, method) {
			if (_[method])
				Class.prototype[method] = addMethod(length, method, attribute)
		})
		return Class
	}
}

function addMethod(length, method, attribute) {
	switch (length) {
		case 1:
			return function() {
				return _[method](this[attribute])
			}
		case 2:
			return function(value) {
				return _[method](this[attribute], value)
			}
		case 3:
			return function(iteratee, context) {
				return _[method](this[attribute], cb(iteratee, this), context)
			}
		case 4:
			return function(iteratee, defaultVal, context) {
				return _[method](
					this[attribute],
					cb(iteratee, this),
					defaultVal,
					context
				)
			}
		default:
			return function() {
				const args = slice.call(arguments)
				args.unshift(this[attribute])
				return _[method].apply(_, args)
			}
	}
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

function cb(iteratee, instance) {
	if (_.isFunction(iteratee)) return iteratee
	if (_.isObject(iteratee) && !instance._isModel(iteratee))
		return modelMatcher(iteratee)
	if (_.isString(iteratee))
		return function(model) {
			return model.get(iteratee)
		}
	return iteratee
}
function modelMatcher(attrs) {
	const matcher = _.matches(attrs)
	return function(model) {
		return matcher(model.attributes)
	}
}
