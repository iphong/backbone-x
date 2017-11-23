import ajax from './ajax'

const _ = require('underscore')

const methodMap = {
	create: 'POST',
	update: 'PUT',
	patch: 'PATCH',
	delete: 'DELETE',
	read: 'GET'
}

function sync(method, model, options) {
	const type = methodMap[method]
	// Default options, unless specified.
	_.defaults(options || (options = {}), {
		emulateHTTP: false,
		emulateJSON: false
	})
	// Default JSON-request options.
	const params = { type: type, dataType: 'json' }
	// Ensure that we have a URL.
	if (!options.url) {
		params.url = _.result(model, 'url')
	}
	// Ensure that we have the appropriate request data.
	if (
		options.data === null &&
		model &&
		(method === 'create' || method === 'update' || method === 'patch')
	) {
		params.contentType = 'application/json'
		params.data = JSON.stringify(options.attrs || model.toJSON(options))
	}
	// For older servers, emulate JSON by encoding the request into an HTML-form.
	if (options.emulateJSON) {
		params.contentType = 'application/x-www-form-urlencoded'
		params.data = params.data ? { model: params.data } : {}
	}
	// For older servers, emulate HTTP by mimicking the HTTP method with `_method`
	// And an `X-HTTP-Method-Override` header.
	if (
		options.emulateHTTP &&
		(type === 'PUT' || type === 'DELETE' || type === 'PATCH')
	) {
		params.type = 'POST'
		if (options.emulateJSON) params.data._method = type
		const beforeSend = options.beforeSend
		options.beforeSend = function(xhr) {
			xhr.setRequestHeader('X-HTTP-Method-Override', type)
			if (beforeSend) return beforeSend.call(this, method, model, options)
		}
	}
	// Don't process data on a non-GET request.
	if (params.type !== 'GET' && !options.emulateJSON) {
		params.processData = false
	}
	// Pass along `textStatus` and `errorThrown` from jQuery.
	const error = options.error
	options.error = function(xhr, textStatus, errorThrown) {
		options.textStatus = textStatus
		options.errorThrown = errorThrown
		if (error) error.call(options.context, xhr, textStatus, errorThrown)
	}
	//Make the request, allowing the user to override any Ajax options.
	// const xhr = new XMLHttpRequest()
	// xhr.open(params.type, params.url, true)
	// xhr.send(params.data)
	// console.log(params.data,JSON.stringify(params.data))
	const xhr = (options.xhr = ajax(Object.assign(params, options)))
	//model.trigger('request', model, xhr, options)
	return xhr
}

export default sync