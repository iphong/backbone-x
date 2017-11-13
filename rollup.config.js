import resolve from 'rollup-plugin-node-resolve';
import babel from 'rollup-plugin-babel';

export default {
	input: './model.js',
	output: {
		file: './dist/model.js',
		format: 'cjs'
	},

	// We need to add this line due to rollup will compile 'this' to undefined in model.js line 27
	// https://github.com/rollup/rollup/wiki/Troubleshooting#this-is-undefined
	// TODO: find proper way to fix 'this' in model.js line 27
	context: 'window',


	plugins: [
		resolve(),
		babel({
			exclude: 'node_modules/**' // only transpile our source code
		})
	]
};