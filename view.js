/*-- Backbone-x 0.0.1           -- */
/*-- Author: phong.vu@me.com    -- */

void function ( root, factory ) {

	// Set up Backbone appropriately for the environment. Start with AMD.
	if ( typeof define === 'function' && define.amd ) {
		define([ 'jquery', 'underscore', 'backbone', 'exports' ], function ( $, _, Backbone, exports ) {
			// Export global even in AMD case in case this script is loaded with
			// others that may still expect a global Backbone.
			root.B = factory(root, exports, $, _, Backbone);
		});

		// Next for Node.js or CommonJS.
	} else if ( typeof exports !== 'undefined' ) {
		var $ = require('jquery');
		var _ = require('underscore');
		var Backbone = require('backbone');
		factory(root, exports, $, _, Backbone);

		// Finally, as a browser global.
	} else {
		root.B = factory(root, root.B || {}, root.jQuery, root._, root.Backbone);
	}

}(this, function ( root, B, $, _, Backbone ) {

	var View, CollectionView, DataBinder;

	_.mixin({
		isPrototypeOf: function( child, parent ) {
			if ( !child || !parent )
				return false;
			var result = false;
			var proto = child.prototype;
			while ( proto ) {
				if ( proto == parent.prototype ) {
					result = true;
					break;
				}
				proto = proto.__proto__;
			}
			return result;
		},
		setPrototypeOf: function( child, prototype ) {
			if (_.isFunction(Object.setPrototypeOf))
				Object.setPrototypeOf(child.prototype || child, prototype);
			else
				(child.prototype || child).__proto__ = prototype;
			return child
		},
		extendPrototype: function( child, prototype ) {
			_.extend(child.prototype, prototype)
			return child
		},
	});

	// Cached backbone prototypes and methods
	var BackboneModel = Backbone.Model;
	var BackboneCollection = Backbone.Collection;
	var BackboneEvents = Backbone.Events;
	var BackboneView = Backbone.View;
	var BackboneViewEnsureElement = BackboneView.prototype._ensureElement;

	// Use this element to store unused element of deleted views
	var $reusableElements = $('<div>');


	/* --- View --- */
	View = B.View = function() {
		function View( options ) {

			if ( !(this instanceof View) )
				return new View(options);

			var options = (options || {});

			this.__ready = _.once(this.__ready);
			this.subViews = [];

			_.extend(this, _.pick(options, 'template', 'views', 'bindings', 'events', 'modelEvents', 'superView'));

			if ( this.template )
				switch ( typeof this.template ) {
					case 'string':
						this.template = this.template.trim();
						if (!this.template.match('<') && !this.template.match(/\s/))
							this.template = $(this.template).html();
						break;
				}

			Object.defineProperties(this, {
				'rootView': {
					get: function() {
						var root = this;
						var parent = this.superView;
						while ( parent ) {
							root = parent;
							parent = parent.superView;
						}
						return root;
					}
				}
			});

			BackboneView.call(this, options);
			this.el && this.el.parentNode && this.__ready();
		}

		_.extend(View.prototype, {
			bindings       : false,
			initialize     : _.noop,
			ready          : _.noop,
			_ensureElement : function() {
				BackboneViewEnsureElement.call(this);
				this.render();
				// This function is called right before initialize
				// So when initialize is called, element HTML is ready to be bound to views
			},
			setModel       : function( model ) {
				if ( !model )
					return;
				if ( this.modelEvents )
					_(this.modelEvents).each(function( handler, bind ) {
						bind = _([ 'event', 'selector' ]).object(_(bind.match(/(.*)\s(.*)/) || [ 0, bind ]).rest(1));
						handler = _.isString(handler) ? this[ handler ] : handler;

						var unbindModel = this.model && bind.selector ? this.model.get(bind.selector) : this.model;
						var bindModel = (bind.selector && this.model) ? this.model.get(bind.selector) : model;

						unbindModel && this.stopListening(unbindModel, bind.event);
						this.listenTo(bindModel, bind.event, handler);

					}, this);
				this.model = model;
				this.setBindingModel(this.model)
				this.trigger('set:model', this.model)
			},
			setBindingModel: function( model ) {
				!this.__dataBinding && console.warn("Data-binding hasn't been initialized for this view.");
				this.__dataBinding && this.__dataBinding.setModel(model);
				this.trigger('set:binding:models', this.__dataBinding.models)
				return this;
			},
			__ready        : function() {
				this.initSubViews();
				this.initDataBinding();
				this.setModel(this.model);
				this.ready();
			},
			freeze         : function() {
				this._frozen = true;
				this.trigger('freeze');
				return this;
			},
			unfreeze       : function() {
				this._frozen = false;
				this.trigger('unfreeze');
				return this;
			},
			preventDefault : function( e ) {
				e.preventDefault();
			},
			stopPropagation: function( e ) {
				e.stopPropagation();
			},
			defer          : function( fn, context ) {
				_.defer(_.bind(fn, context || this));
				return this;
			},
			delay          : function( fn, delay, context ) {
				_.delay(_.bind(fn, context || this), delay);
				return this;
			},
			render         : function() {
				return this.__render.apply(this, arguments);
			},
			__render       : function() {
				this.trigger('before:render');
				this.template && this.$el.html(this.template);
				this.trigger('render');
				return this;
			},

			initDataBinding: function() {
				if ( this.__dataBinding )
					return;
				this.__dataBinding = new DataBinder(this, this.model, { bindings: _.result(this, 'bindings') || [] });
			},
			initSubViews   : function() {
				var regex = (/^(\w+)(?: (collection|model):([$\w.]+))?\s*>\s*(.*)$/);
				_.each(this.views, function( view, define ) {
					var match = define.match(regex);
					if ( !match )
						throw "View definition syntax error: '" + define + "'";
					var key = match[ 1 ];
					var type = match[ 2 ];
					var attr = match[ 3 ];
					var selector = match[ 4 ];
					var options = {};
					type && attr && (options[ type ] = (attr == '$model') ? this.model : (attr == '$collection') ? this.collection : this.model.get(attr));
					this[ key ] = this.attachView(view, selector, options);
				}, this);
			},
			hasView        : function( view ) {
				return this.subViews && this.subViews.indexOf(view) > -1;
			},
			attachView     : function( view, selector, options ) {
				var el = this.$(selector).get(0);
				if ( !el )
					throw 'No element found for selector "' + selector + '"';
				if ( _.isFunction(view) ) {
					options || (options = {});
					options.el = el;
					options.superView = this;
					view = new view(options);
				}
				else {
					view.setElement(el);
					view.superView = this;
					this.hasView(view) || this.subViews.push(view);
				}
				view.__ready();
				return view;
			},
			appendView     : function( view ) {
				this.hasView(view) || this.subViews.push(view);
				view.superView = this;
				view.$el.appendTo(this.el);
				view.__ready();
				return view;
			},
			prependView    : function( view ) {
				this.hasView(view) || this.subViews.push(view);
				view.superView = this;
				view.$el.prependTo(this.el);
				view.__ready();
				return view;
			},
			remove         : function() {
				this.trigger('before:remove');
				BackboneView.prototype.remove.call(this);
				this.superView &&
				this.superView.subViews &&
				_(this.superView.subViews).each(function( subView, index ) {
					if ( subView && subView.cid == this.cid )
						this.superView.subViews.splice(index, 1);
				}, this);
				this.trigger('remove');
				return this;
			}
		});
		_.setPrototypeOf(View, BackboneView.prototype);
		View.extend = BackboneView.extend;
		return View;
	}()

	/* --- CollectionView --- */
	CollectionView = B.CollectionView = function() {
		function CollectionView( options ) {

			if ( !(this instanceof CollectionView) )
				return new CollectionView(options);

			this.previousSubViews = {};
			this.options = options || {};
			this._debounceReset = _.debounce(this.reset);
			options.collection || (options.collection = new BackboneCollection);
			View.call(this, options);
		}

		_.extend(CollectionView.prototype, {
			itemView       : View,
			itemViews      : {},
			_reverseOrder  : false,
			_ensureElement : function() {
				BackboneViewEnsureElement.call(this);
				this.__render();
				// This function is called right before initialize
				// So when initialize is called, element HTML is ready to be bound to views
				this.getItemTemplate();
			},
			__ready        : function() {
				this.setCollection(this.collection);
				this.ready();
			},
			getItemTemplate: function() {
				if (!_.isEmpty(this.itemViews)) {
					_.each(this.el.children, function( child ) {
						var rel = child.getAttribute('data-relation');
						if (rel && this.itemViews[rel]) {
							var template = child.innerHTML.trim();
							if ( this.itemViews[rel].prototype == View.prototype )
								this.itemViews[rel] = this.itemViews[rel].extend();
							_.extend(this.itemViews[rel].prototype, {
								template  : template,
								tagName   : child.tagName,
								className : child.className,
								attributes: _(child.attributes)
									.chain()
									.values()
									.map(function( attr ) {
										return attr.name;
									})
									.object([])
									.mapObject(function( value, key ) {
										return child.getAttribute(key);
									})
									.value()
							});
						}
					}, this);
				}
				else {
					var child = this.el.children[ 0 ];
					if ( child ) {
						var template = child.innerHTML.trim();
						if ( this.itemView.prototype == View.prototype )
							this.itemView = this.itemView.extend();
						_.extend(this.itemView.prototype, {
							template  : template,
							tagName   : child.tagName,
							className : child.className,
							attributes: _(child.attributes)
								.chain()
								.values()
								.map(function( attr ) {
									return attr.name;
								})
								.object([])
								.mapObject(function( value, key ) {
									return child.getAttribute(key);
								})
								.value()
						});
					}
				}
				this.$el.empty();
			},
			setCollection  : function( collection ) {
				if ( !collection )
					return;
				if ( this.collection ) {
					this.stopListening(this.collection, 'add', this.reset);
					this.stopListening(this.collection, 'reset', this.reset);
					this.stopListening(this.collection, 'sort', this.reset);
					this.trigger('unset:collection', this.collection);
				}
				this.collection = collection;
				this.listenTo(this.collection, 'add', this.reset);
				this.listenTo(this.collection, 'reset', this.reset);
				this.listenTo(this.collection, 'sort', this.reset);
				this.trigger('set:collection', this.collection);
				this.reset();
			},
			add            : function( model ) {
				if ( this.previousSubViews[ model.cid ] ) {
					var view = this.previousSubViews[ model.cid ];
					delete this.previousSubViews[ model.cid ];
				}
				else {
					var viewClass = this.itemView;
					if (model.get('_rel') && this.itemViews[model.get('_rel')])
						viewClass = this.itemViews[model.get('_rel')];
					var view = new viewClass({ model: model });
				}
				view.mid = model.cid;
				this._reverseOrder ?
				this.prependView(view) :
				this.appendView(view);
				return view;
			},
			reset          : function( models ) {
				while ( this.subViews.length ) {
					var view = this.subViews.pop();
					this.previousSubViews[ view.mid ] = view;
				}
				this.collection.each(this.add, this);

				for ( var key in this.previousSubViews ) {
					this.previousSubViews[ key ].$el.appendTo($reusableElements);
					//delete this.previousSubViews[key];
				}
				return this;
			}
		})
		_.setPrototypeOf(CollectionView, View.prototype);
		CollectionView.extend = View.extend;
		return CollectionView;
	}()

	/* --- Data Binder --- */
	DataBinder = B.DataBind = function() {

		// Parse element data binding definition string
		var bindingRegex = (/(?:(\w+):)?({.*}|[^;]+);?/ig);

		var parseb = function parseBindingString( string ) {
			var bindRegex = (/\s*(\w+)\s*:\s*([^,{]+(?!\()|\{(.+)\},(?=\s*\w)|\w+\(.+\)),?/g);
			var match, obj = Object.create(null, {});
			var string = string
				.replace(/\s+/, ' ')
				.replace(/(.*)\}$/, '$1},a');
			while ( match = bindRegex.exec(string) ) {
				var key          = match[ 1 ],
				    value        = match[ 2 ],
				    nestedValues = match[ 3 ];
				if ( nestedValues )
					value = parseBindingString(nestedValues);
				obj[ key ] = value;
			}
			return obj;
		};

		function DataBinder( view, models, options ) {

			if ( this instanceof DataBinder === false )
				return new DataBinder(view, models, options);

			options || (options = {});

			this.options = _(options).defaults({
				bindings: []
			});

			this.view = null;
			this.models = [];
			this.bindings = [];

			_.bindAll(this,
				'inputEventHandler',
				'changeEventHandler'
			);

			this.setupView(view);
			this.setModel(models);

			return this;
		};

		_.setPrototypeOf(DataBinder, BackboneEvents);

		_.extend(DataBinder.prototype, {

			setModel: function( models ) {
				var self = this;
				_(self.models).each(function( model ) {
					self.stopListening(model);
				}, self);
				self.models = _.filter(_.isArray(models) ? models : [ models ], function( model ) {
					return model instanceof BackboneModel;
				});
				_(self.models).each(function( model ) {
					_.each(self.bindingsIndex, function( bindings, attr ) {
						self.listenTo(model, 'change:' + attr, function( model, value, options ) {
							self.updateView(attr)
						});
					})
				}, self);
				self.updateView();
				self.trigger('set:models', self.models)
				return this;
			},

			setupView : function( view ) {
				if ( view instanceof Backbone.View == false )
					return false;

				_(this.bindings).each(function( binding ) {
					binding.$el.off(binding.events || 'change', this.changeEventHandler);
				}, this);

				var self = this;
				var binding, $children, matched, type, value;

				this.view = view;
				this.bindings = [];
				this.bindingsIndex = {};

				_(this.options.bindings).each(function( opt ) {
					$children = view.$(opt.selector);
					($children.length ? $children : view.$el).each(function( index, el ) {
						_(_.isString(opt.attr) ? [ opt.attr ] : opt.attr).each(function( attribute, key ) {
							binding = _({
								$el : $(el),
								el  : el,
								type: opt.type,
								attr: attribute
							}).defaults(opt);
							if ( _.isString(key) )
								binding.key = key;

							self.bindings.push(binding);

							boundAttributes = [ binding.attr ];
							_(boundAttributes).each(function( attr ) {
								self.bindingsIndex[ attr ] || (self.bindingsIndex[ attr ] = []);
								self.bindingsIndex[ attr ].indexOf(binding) == -1 && self.bindingsIndex[ attr ].push(binding);
							});
						});
					});
				});

				var hasBindingEl;
				if ( view.$el.attr('data-bind') )
					parseBinding(view.el);
				while ( hasBindingEl = view.el.querySelector('[data-bind]') )
					parseBinding(hasBindingEl);

				function parseBinding( el ) {

					var $el = $(el);
					var syntax = ($el.attr('data-bind') || '').replace(/\s+/g, '');
					bindingRegex.lastIndex = 0;
					$el.removeAttr('data-bind');

					matching : while ( matched = bindingRegex.exec(syntax) ) {
						type = matched[ 1 ];
						value = matched[ 2 ];

						if ( !type )
							if ( $el.is('input[type="checkbox"]') )
								type = 'checked';
							else if ( $el.is('input[type="radio"]') )
								type = 'radio';
							else if ( $el.is('input,select,textarea') )
								type = 'value';
							else if ( $el.is('[contenteditable]') )
								type = 'html';
							else
								type = 'text';

						if ( type == 'model' ) {
							_.defer(function( view, value, template ) {
								var childView = view[ value + 'View' ] = new View({
									el: el,
									template: template
								});
								view.on('set:model', function() {
									var model = value == 'this' || value == '$model' ? view.model : view.model.get(value);
									childView.setModel(model);
								});
								view.model && view.trigger('set:model', view.model);
							}, view, value, el.innerHTML);

							el.innerHTML = '';
							continue matching;
						}
						if ( type == 'collection' ) {
							_.defer(function( view, value, template ) {
								var childView = view[ value + 'View' ] = new CollectionView({
									el      : el,
									template: template
								});
								if (value == 'this' || value == '$collection') {
									view.on('set:collection', function() {
										childView.setCollection(view.collection);
									})
									view.collection && view.trigger('set:collection', view.collection);
								}
								else {
									view.on('set:model', function() {
										childView.setCollection(view.model.get(value));
									});
									view.model && view.trigger('set:model', view.model);
								}
							}, view, value, el.innerHTML);

							el.innerHTML = '';
							continue matching;
						}

						nested = value.match(/{(.*)}/);
						value = nested ? nested[ 1 ] : value;
						_(nested ? nested[ 1 ].split(',') : [ value ]).each(function( string ) {
							split = string.split(':');
							binding = {
								$el : $el,
								el  : el,
								type: type,
								attr: split.length == 1 ? split[ 0 ] : split[ 1 ]
							}
							if ( split.length == 2 )
								binding.key = split[ 0 ];
							if ( $el.data('bind-events') )
								binding.events = $el.data('bind-events');

							self.bindings.push(binding);

							boundAttributes = [ binding.attr ];
							_(boundAttributes).each(function( attr ) {
								self.bindingsIndex[ attr ] || (self.bindingsIndex[ attr ] = []);
								self.bindingsIndex[ attr ].indexOf(binding) == -1 && self.bindingsIndex[ attr ].push(binding);
							});
						});
					}
				}

				_(this.bindings).each(function( binding ) {
					//binding.$el.on( 'input', { binding: binding }, this.inputEventHandler);
					binding.$el.on(binding.events || 'change', { binding: binding }, this.changeEventHandler);

					binding.$el
						.removeAttr('data-bind')
						.removeAttr('data-bind-events');
				}, this);
			},
			updateView: function( attr ) {

				var self = this;
				var value, originalValue, setter;

				_(attr ? self.bindingsIndex[ attr ] : self.bindings).each(function( binding ) {

					value = self.getData(binding.attr);
					if ( value instanceof BackboneModel || value instanceof BackboneCollection ) {
						originalValue = value;
						value = value.toJSON();
					}

					setter = binding.set || self.setters[ binding.type ] || null;

					if ( setter ) {
						if ( _.isFunction(binding.parse) )
							value = binding.parse.call(binding, value, binding.key, self.view);
						setter(binding.$el, value, binding.key);
					}
				});
			},

			setters: {
				text    : function( $el, value ) {
					($el.text() === value) || $el.text(_.isUndefined(value) ? ' ' : value);
				},
				html    : function( $el, value ) {
					($el.html() === value) || $el.html(_.isUndefined(value) ? ' ' : value);
				},
				value   : function( $el, value ) {
					($el.val() === value) || $el.val(_.isUndefined(value) ? ' ' : value);
				},
				attr    : function( $el, value, key ) {
					if ( !key ) return;
					$el.attr(key, value);
				},
				prop    : function( $el, value, key ) {
					if ( !key ) return;
					$el.prop(key, value);
				},
				style   : function( $el, value, key ) {
					key ? $el.css(key, value) : $el.css(value || {});
				},
				class   : function( $el, value, key ) {
					$el[ value ? 'addClass' : 'removeClass' ](key);
				},
				checked : function( $el, value ) {
					$el.attr('checked', value);
				},
				radio : function( $el, value ) {
					$el.attr('checked', $el.val() == value ? true : false );
				},
				enabled : function( $el, value ) {
					$el.attr('disabled', !value);
				},
				disabled: function( $el, value ) {
					$el.attr('disabled', value);
				},
				toggle  : function( $el, value ) {
					$el.toggle(value);
				},
				visible : function( $el, value ) {
					$el.toggle(!!value);
				},
				hidden  : function( $el, value ) {
					$el.toggle(!value);
				},
			},
			getters: {
				text   : function( $el ) {
					return $el.text();
				},
				html   : function( $el ) {
					return $el.html();
				},
				value  : function( $el ) {
					var value = $el.val();
					if ( $el.is('input[type="number"],input[type="range"]') ) {
						value = parseFloat(value);
						if(_.isNaN(value) ) value = '';
					}
					return value
				},
				checked: function( $el ) {
					return $el.prop('checked');
				},
				radio: function( $el ) {
					return $el.prop('checked') ? $el.val() : undefined;
				},
			},

			getData: function( key ) {
				var values = [];
				_.each(this.models, function( model ) {
					var value = model.get(key);
					values.indexOf(value) == -1 && values.push(value);
				});
				return values.length < 2 ? values[ 0 ] : '-';
			},
			setData: function( key, value ) {
				_.invoke(this.models, 'set', key, value);
			},

			inputEventHandler : function( e ) {
				return;
				if ( e.data && e.data.binding && e.data.binding.$el.is(e.currentTarget) ) {
					var binding = e.data.binding;
					if ( this.getters[ binding.type ] ) {
						var value = this.getters[ binding.type ](binding.$el);
						console.log(value)
						_.invoke(this.models, 'trigger', 'input', binding.attr, value);
						_.invoke(this.models, 'trigger', 'input:' + binding.attr, value);
					}
				}
			},
			changeEventHandler: function( e ) {
				if ( e.data && e.data.binding && e.data.binding.$el.is(e.currentTarget) ) {
					var binding = e.data.binding;
					if ( this.getters[ binding.type ] ) {
						var value =  this.getters[ binding.type ](binding.$el, e);
						value === undefined || this.setData( binding.attr, value );
					}
				}
			}

		});

		return DataBinder;
	}();

	return B;
});