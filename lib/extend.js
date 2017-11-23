import _ from 'underscore'
export default function extend(prototypes, statics) {
	const Class = class extends this {
		get name() {
			return prototypes.name || this.name
		}
	}
	Object.assign(Class, statics, _.pick(prototypes, 'model', 'idAttribute', 'defaults', 'relations', 'computes'))
	Object.assign(Class.prototype, _.omit(prototypes, 'model', 'idAttribute', 'defaults', 'relations', 'computes'))
	return Class
}
