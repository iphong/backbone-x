function splice(array, insert, at) {
	at = Math.min(Math.max(at, 0), array.length)
	const tail = Array(array.length - at)
	const length = insert.length
	let i
	for (i = 0; i < tail.length; i++) tail[i] = array[i + at]
	for (i = 0; i < length; i++) array[i + at] = insert[i]
	for (i = 0; i < tail.length; i++) array[i + length + at] = tail[i]
}

export default splice