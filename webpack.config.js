const path = require('path')
const webpack = require('webpack')

module.exports = [
	{
		devtool: 'source-map',
		entry: './src/index.js',
		output: {
			path: path.resolve(__dirname, './dist'),
			filename: 'index.js',
			library: 'backbonex',
			libraryTarget: 'umd'
		},
		module: {
			rules: [
				{
					test: /\.js$/,
					exclude: [/node_modules/],
					use: 'babel-loader?compact&cacheDirectory'
				}
			]
		},
		externals: {
			jquery: 'jquery'
		},
		// plugins: [
		// 	new webpack.optimize.UglifyJsPlugin({
		// 		mangle: true,
		// 		minimize: true,
		// 		comments: false,
		// 		compress: {
		// 			screw_ie8: true,
		// 			warnings: false,
		// 			drop_console: true,
		// 			dead_code: true,
		// 			unused: true
		// 		}
		// 	})
		// ]
	}
]
