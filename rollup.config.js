import resolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'

export default {
	input: './src/index.js',
	output: {
		file: './dist/cjs.bundle.js',
		format: 'cjs'
	},
	plugins: [
		resolve(),
		babel({
			plugins: ['external-helpers'],
			exclude: 'node_modules/**' // only transpile our source code
		})
	]
}
