const path = require('path');

module.exports = {
	entry: {
		model: './model.js'
	},
	output: {
		filename: './dist/[name].js',
		library: 'backbone-x',
		libraryTarget: 'umd'
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: [/node_modules/],
				use: 'babel-loader'
			}
		]
	}
};