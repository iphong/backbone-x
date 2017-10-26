import Parse from 'parse'
import Events from './Events'
import { Model, Collection } from './Extended'

window.Model = Model
window.Collection = Collection

class Person extends Model {
	get defaults() {
		return {
			name: 'title',
			books: []
		}
	}
	get relations() {
		return {
			books: class Books extends Collection {
				get model() {
					return class Book extends Model {
						get defaults() {
							return {
								title: 'Title',
								author: 'Author'
							}
						}
					}
				}
			}
		}
	}
}
window.person = new Person

class App extends Model {
	get defaults() {
		return {
			children: []
		}
	}
	get relations() {
		return {
			page: Page
		}
	}
	get computes() {
		return {
			foo: model => {
				return 10
			}
		}
	}
}
class Items extends Collection {
	get model() {
		return Item
	}
}
class Item extends Model {get defaults() {
	return {
		foo: []
	}
}
	get relations() {
		return {
			children: Items
		}
	}
}
class Page extends Model {
	get relations() {
		return {
			items: Items
		}
	}
}

window.app = new App()
