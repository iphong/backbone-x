/**
 * Created by phong on 5/21/17.
 */

const { Model, Compute, Collection, Type } = require('../model');
// const Types = require('prop-types');
const _ = require('underscore')


const Address = Model({
	name: Model({
		first: 'Jason',
		middle: '',
		last: 'White',
		full: Compute({
			get(  ) {
				const { first, middle, last } = this.pick('first', 'middle', 'last')
				return [ first, middle, last ].join(' ').replace(/\s+/, ' ');
			},
			set( value ) {
				let s = value.split(' ');
				this.set('first', s.length > 0 ? s[ 0 ] : '');
				this.set('middle', s.length > 2 ? s.slice(1, -1).join(' ') : '');
				this.set('last', s.length > 1 ? s[ s.length - 1 ] : '');
			},
		}),
	}),
});

const a = new Address;

console.log(a.toJSON());
console.log(a.get('name.first'));
console.log(a.get('name.full'));
a.set('name', { first: 'Hell', last: 'yeah' });
console.log(a.toJSON());
a.set('name.full', 'Foo Bar');
console.log(a.get('name.full'));
console.log(a.toJSON());
console.log(a.get('name').get('full'))
