function ajax(options) {
	const xhr = new XMLHttpRequest()
	const error = options.error
	const success = options.success
	xhr.open(options.type, options.url, true)
	if (options.contentType) {
		xhr.setRequestHeader('Content-Type', options.contentType)
	}
	xhr.addEventListener('load', e => {
		if (xhr.status === 200) {
			let data = xhr.responseText
			if (options.dataType === 'json') {
				try {
					data = JSON.parse(data)
				} catch (err) {
					error(xhr, xhr.statusText, err)
				}
			}
			success(data)
		} else {
			error(xhr, xhr.statusText)
		}
	})
	xhr.send(options.data)
	return xhr
}

export default ajax