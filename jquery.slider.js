/*!
 * jQuery Content Slider
 *
 * @author Hans Christian Reinl - @drublic
 * @version 0.4.0
 */


(function($) {

	'use strict';

	var SLIDER = {

		defaults: {
			animation: 'horizontal-push',    // fade, horizontal-slide, vertical-slide, horizontal-push, vertical-push
			animationSpeed: 600,             // how fast animtions are
			timer: true,                     // true or false to have the timer
			advanceSpeed: 4000,              // if timer is enabled, time between transitions
			pauseOnHover: false,             // if you hover pauses the slider
			startClockOnMouseOut: false,     // if clock should start on MouseOut
			startClockOnMouseOutAfter: 1000, // how long after MouseOut should the timer start again
			directionalNav: true,            // manual advancing directional navs
			captions: true,                  // do you want captions?
			captionAnimation: 'fade',        // fade, slideOpen, none
			captionAnimationSpeed: 600,      // if so how quickly should they animate in
			bullets: false,                  // true or false to activate the bullet navigation
			bulletThumbs: false,             // thumbnails for the bullets
			bulletThumbLocation: '',         // location from this file where thumbs will be
			beforeSlideChange: $.noop,       // empty function
			afterSlideChange: $.noop,        // empty function
			afterInit: $.noop,               // when slider initialisation is done
			touchNavigation: true,           // Turn on or off navigation on slide
			fluid: true,                     // true or ratio (ex: 4x3) to force an aspect ratio for content slides, only works from within a fluid layout
			centerBullets: true,             // center bullet nav with js, turn this off if you want to position the bullet nav manually
			carousel: false                  // Show prev and next slide
		},

		activeSlide: 0,
		numberSlides: 0,
		sliderWidth: null,
		sliderHeight: null,
		locked: null,
		timerRunning: null,
		degrees: 0,
		wrapperHTML: '<div class="slider-wrapper" />',
		timerHTML: '<div class="timer"><span class="mask"><span class="rotator"></span></span><span class="pause"></span></div>',
		captionHTML: '<div class="slider-caption"></div>',
		directionalNavHTML: '<div class="slider-nav"><a href="#!" class="right">Right</a><a href="#!" class="left">Left</a></div>',
		bulletHTML: '<ul class="slider-bullets"></ul>',

		init: function (element, options) {
			var $imageSlides;
			var imagesLoadedCount = 0;
			var self = this;

			// Bind functions to correct context
			this.clickTimer = $.proxy(this.clickTimer, this);
			this.addBullet = $.proxy(this.addBullet, this);
			this.resetAndUnlock = $.proxy(this.resetAndUnlock, this);
			this.stopClock = $.proxy(this.stopClock, this);
			this.startTimerAfterMouseLeave = $.proxy(this.startTimerAfterMouseLeave, this);
			this.clearClockMouseLeaveTimer = $.proxy(this.clearClockMouseLeaveTimer, this);
			this.rotateTimer = $.proxy(this.rotateTimer, this);

			this.onTouchStart = $.proxy(this.onTouchStart, this);
			this.onTouchMove = $.proxy(this.onTouchMove, this);
			this.onTouchEnd = $.proxy(this.onTouchEnd, this);
			this.resetSlider = $.proxy(this.resetSlider, this);
			this.getCurrentSlide = $.proxy(this.getCurrentSlide, this);

			this.options = $.extend({}, this.defaults, options);

			if (typeof this.options.timer !== 'boolean') {
				this.options.timer = Boolean(this.options.timer);
			}

			if (typeof this.options.captions !== 'boolean') {
				this.options.captions = Boolean(this.options.captions);
			}

			if (typeof this.options.directionalNav !== 'boolean') {
				this.options.directionalNav = Boolean(this.options.directionalNav);
			}

			if (typeof this.options.carousel !== 'boolean') {
				this.options.carousel = Boolean(this.options.carousel);
			}

			this.$element = $(element);
			this.$wrapper = this.$element.wrap(this.wrapperHTML).parent();
			this.$slides = this.$element.children('img, a, div, li');

			// Touch
			this.startX = null;
			this.startY = null;
			this.cwidth = null;
			this.dx = null;
			this.scrolling = false;

			// Initialize touch events
			if (this.$element[0].addEventListener) {
				this.$element[0].addEventListener('touchstart', this.onTouchStart, false);
			}

			// Initialize events
			this.events.call(this);

			// Make it a carousel
			if (this.options.carousel) {
				this.makeCarousel();
			}

			// Get all images
			$imageSlides = this.$slides.filter('img');

			if ($imageSlides.length === 0) {
				this.loaded();
			} else {
				$imageSlides.on('imageready', function () {
					imagesLoadedCount += 1;
					if (imagesLoadedCount === $imageSlides.length) {
						self.loaded();
					}
				});
			}
		},

		/**
		 * Events for the slider
		 */
		events: function () {
			var _self = this;

			this.$element
				.on('slider.next', function () {
					_self.shift('next');
				})

				.on('slider.prev', function () {
					_self.shift('prev');
				})

				.on('slider.goto', function (event, index) {
					_self.shift(index);
				})

				.on('slider.start', function () {
					_self.startClock();
				})

				.on('slider.stop', function () {
					_self.stopClock();
				});
		},

		/**
		 * Change the slider to a carousel
		 */
		makeCarousel: function () {

			// Add a class for styling
			this.$wrapper.addClass('slider-carousel');

			// Add initial second slide
			this.$slides.eq(1).addClass('slide-carousel-next');
			this.$slides.last().addClass('slide-carousel-previous');
		},

		loaded: function () {
			this.$element
				.addClass('slider');

			this.setDimentionsFromLargestSlide();
			this.updateOptionsIfOnlyOneSlide();
			this.setupFirstSlide();

			if (this.options.timer) {
				this.setupTimer();
				this.startClock();
			}

			if (this.options.captions) {
				this.setupCaptions();
			}

			if (this.options.directionalNav) {
				this.setupDirectionalNav();
			}

			if (this.options.bullets) {
				this.setupBulletNav();
				this.setActiveBullet();
			}

			if (this.options.afterInit) {
				this.options.afterInit(this);
			}
		},

		/**
		 * Get current slide element
		 * @return {jQuery Object}
		 */
		currentSlide: function () {
			return this.$slides.eq(this.activeSlide);
		},

		setDimentionsFromLargestSlide: function () {

			// Collect all slides and set slider size of largest image
			var self = this;
			var $fluidPlaceholder;

			self.$element.add(self.$wrapper).width(this.$slides.first().outerWidth());
			self.$element.add(self.$wrapper).height(this.$slides.first().height());
			self.sliderWidth = this.$slides.first().outerWidth();
			self.sliderHeight = this.$slides.first().height();
			$fluidPlaceholder = this.$slides.first().clone();

			this.$slides.each(function () {
				var slide = $(this);
				var slideWidth = slide.width();
				var slideHeight = slide.height();

				if (slideWidth > self.$element.width()) {
					self.$element.add(self.$wrapper).width(slideWidth);
					self.sliderWidth = self.$element.width();
				}

				if (slideHeight > self.$element.height()) {
					self.$element.add(self.$wrapper).height(slideHeight);
					self.sliderHeight = self.$element.height();
					$fluidPlaceholder = $(this).clone();
				}

				self.numberSlides += 1;
			});

			if (typeof this.options.fluid === 'string') {
				$fluidPlaceholder = $('<img src="http://placehold.it/' + this.options.fluid + '">');
			}

			self.$element.prepend($fluidPlaceholder);
			$fluidPlaceholder.addClass('fluid-placeholder');
			self.$element.add(self.$wrapper).css({
				width: 'inherit',
				height: 'inherit'
			});

			$(window).on('resize', function () {
				self.sliderWidth = self.$element.width();
				self.sliderHeight = self.$element.height();
			});
		},

		/*
		 * Animation locking functions
		 */
		lock: function () {
			this.locked = true;
		},

		unlock: function () {
			this.locked = false;
		},

		updateOptionsIfOnlyOneSlide: function () {
			if(this.$slides.length === 1) {
				this.options.directionalNav = false;
				this.options.timer = false;
				this.options.bullets = false;
			}
		},

		/*
		 * Set initial front image
		 */
		setupFirstSlide: function () {
			this.$slides.first()
				.addClass('active');
		},

		startClock: function () {
			var self = this;

			if (!this.options.timer) {
				return false;
			}

			if (this.$timer.is(':hidden')) {
				this.clock = setInterval(function () {
					self.$element.trigger('slider.next');
				}, this.options.advanceSpeed);
			} else {
				this.timerRunning = true;
				this.$pause.removeClass('active');
				this.clock = setInterval(this.rotateTimer, this.options.advanceSpeed / 180);
			}
		},

		rotateTimer: function () {
			var degreeCSS = 'rotate(' + this.degrees + 'deg)';

			this.degrees += 2;
			this.$rotator.css({
				'-webkit-transform': degreeCSS,
				   '-moz-transform': degreeCSS,
				     '-o-transform': degreeCSS,
				        'transform': degreeCSS
			});

			if (this.degrees > 180) {
				this.$rotator.addClass('move');
				this.$mask.addClass('move');
			}

			if (this.degrees > 360) {
				this.$rotator.removeClass('move');
				this.$mask.removeClass('move');
				this.degrees = 0;
				this.$element.trigger('slider.next');
			}
		},

		stopClock: function () {
			if (!this.options.timer) {
				return false;
			} else {
				this.timerRunning = false;
				clearInterval(this.clock);
				this.$pause.addClass('active');
			}
		},

		setupTimer: function () {
			this.$timer = $(this.timerHTML);
			this.$wrapper.append(this.$timer);

			this.$rotator = this.$timer.find('.rotator');
			this.$mask = this.$timer.find('.mask');
			this.$pause = this.$timer.find('.pause');

			this.$timer.click(this.clickTimer);

			if (this.options.startClockOnMouseOut) {
				this.$wrapper.mouseleave(this.startTimerAfterMouseLeave);
				this.$wrapper.mouseenter(this.clearClockMouseLeaveTimer);
			}

			if (this.options.pauseOnHover) {
				this.$wrapper.mouseenter(this.stopClock);
			}
		},

		startTimerAfterMouseLeave: function () {
			var self = this;

			this.outTimer = setTimeout(function() {
				if(!self.timerRunning){
					self.startClock();
				}
			}, this.options.startClockOnMouseOutAfter);
		},

		clearClockMouseLeaveTimer: function () {
			clearTimeout(this.outTimer);
		},

		clickTimer: function () {
			if (!this.timerRunning) {
				this.startClock();
			} else {
				this.stopClock();
			}
		},

		setupCaptions: function () {
			this.$caption = $(this.captionHTML);
			this.$wrapper.append(this.$caption);
			this.setCaption();
		},

		setCaption: function () {
			var captionLocation = this.currentSlide().attr('data-caption');
			var captionHTML;

			if (!this.options.captions) {
				return false;
			}

			// Set HTML for the caption if it exists
			if (captionLocation) {
				captionHTML = $(captionLocation).html(); // get HTML from the matching HTML entity
				this.$caption
					.attr('id', captionLocation) // Add ID caption TODO why is the id being set?
					.html(captionHTML); // Change HTML in Caption

				// Animations for Caption entrances
				switch (this.options.captionAnimation) {
					case 'none':
						this.$caption.show();
						break;
					case 'fade':
						this.$caption.fadeIn(this.options.captionAnimationSpeed);
						break;
					case 'slideOpen':
						this.$caption.slideDown(this.options.captionAnimationSpeed);
						break;
				}
			} else {

				// Animations for Caption exits
				switch (this.options.captionAnimation) {
					case 'none':
						this.$caption.hide();
						break;
					case 'fade':
						this.$caption.fadeOut(this.options.captionAnimationSpeed);
						break;
					case 'slideOpen':
						this.$caption.slideUp(this.options.captionAnimationSpeed);
						break;
				}
			}
		},

		setupDirectionalNav: function () {
			var self = this;

			this.$wrapper.append(this.directionalNavHTML);

			this.$wrapper.find('.left').on('click', function (event) {
				event.preventDefault();
				self.stopClock();
				self.$element.trigger('slider.prev');
			});

			this.$wrapper.find('.right').on('click', function (event) {
				event.preventDefault();
				self.stopClock();
				self.$element.trigger('slider.next');
			});
		},

		setupBulletNav: function () {
			this.$bullets = $(this.bulletHTML);
			this.$wrapper.append(this.$bullets);
			this.$slides.each(this.addBullet);
			this.$element.addClass('with-bullets');

			if (this.options.centerBullets) {
				this.$bullets.css('margin-left', -this.$bullets.width() / 2);
			}
		},

		addBullet: function (index, slide) {
			var position = index + 1;
			var $li = $('<li><a href="#">' + position + '</a></li>');
			var thumbName;
			var self = this;

			if (this.options.bulletThumbs) {
				thumbName = $(slide).attr('data-thumb');

				if (thumbName) {
					$li
						.addClass('has-thumb')
						.css({
							background: 'url(' + this.options.bulletThumbLocation + thumbName + ') no-repeat'
						});
				}
			}

			this.$bullets.append($li);
			$li.data('index', index);

			$li.click(function () {
				self.stopClock();
				self.$element.trigger('slider.goto', [$li.data('index')]);
			});
		},

		setActiveBullet: function () {
			if (!this.options.bullets) {
				return false;
			} else {
				this.$bullets.find('li')
					.removeClass('active')
					.eq(this.activeSlide)
					.addClass('active');
			}
		},

		/**
		 * Reset the slider
		 */
		resetAndUnlock: function () {
			this.$slides
				.eq(this.prevActiveSlide)
				.removeClass('active');
			this.unlock();
			this.options.afterSlideChange.call(this, this.$slides.eq(this.prevActiveSlide), this.$slides.eq(this.activeSlide));
		},

		/**
		 * All functions for animations
		 */
		animations: {
			fade: function () {
				this.$slides.eq(this.activeSlide)
					.css({ 'opacity' : 0 })
					.addClass('active')
					.animate({ 'opacity': 1 }, this.options.animationSpeed, this.resetAndUnlock);
			},

			horizontalSlide: function (direction) {
				if (direction === 'next') {
					this.$slides
						.eq(this.activeSlide)
						.addClass('active')
						.css({ left: this.sliderWidth})
						.animate({ left : 0 }, this.options.animationSpeed, this.resetAndUnlock);
				}

				if (direction === 'prev') {
					this.$slides.eq(this.activeSlide)
						.addClass('active')
						.css({ left: -this.sliderWidth})
						.animate({ left: 0 }, this.options.animationSpeed, this.resetAndUnlock);
				}
			},

			verticalSlide: function (direction) {
				if (direction === 'prev') {
					this.$slides.eq(this.activeSlide)
						.addClass('active')
						.css({ top: this.sliderHeight })
						.animate({ top : 0 }, this.options.animationSpeed, this.resetAndUnlock);
				}

				if (direction === 'next') {
					this.$slides.eq(this.activeSlide)
						.addClass('active')
						.css({ top: -this.sliderHeight })
						.animate({ top: 0 }, this.options.animationSpeed, this.resetAndUnlock);
				}
			},

			horizontalPush: function (direction) {
				if (direction === 'next') {
					this.$slides.eq(this.activeSlide)
						.addClass('active')
						.css({ left: this.sliderWidth})
						.animate({ left: 0 }, this.options.animationSpeed, this.resetAndUnlock);

					this.$slides.eq(this.prevActiveSlide)
						.animate({ left: -this.sliderWidth }, this.options.animationSpeed);
				}

				if (direction === 'prev') {
					this.$slides.eq(this.activeSlide)
						.addClass('active')
						.css({ left: -this.sliderWidth})
						.animate({ left: 0 }, this.options.animationSpeed, this.resetAndUnlock);

					this.$slides.eq(this.prevActiveSlide)
						.animate({ left: this.sliderWidth }, this.options.animationSpeed);
				}
			},

			verticalPush: function (direction) {
				if (direction === 'next') {
					this.$slides.eq(this.activeSlide)
						.addClass('active')
						.css({ top: -this.sliderHeight })
						.animate({ top: 0 }, this.options.animationSpeed, this.resetAndUnlock);

					this.$slides.eq(this.prevActiveSlide)
						.animate({ top: this.sliderHeight }, this.options.animationSpeed);
				}

				if (direction === 'prev') {
					this.$slides.eq(this.activeSlide)
						.addClass('active')
						.css({top: this.sliderHeight})
						.animate({top : 0}, this.options.animationSpeed, this.resetAndUnlock);

					this.$slides.eq(this.prevActiveSlide)
						.animate({ top: -this.sliderHeight }, this.options.animationSpeed);
				}
			}
		},


		/**
		 * Set the next slide for carousels
		 */
		setNextSlide: function () {
			var nextSlideId = this.activeSlide + 1;

			if (nextSlideId === this.$slides.last().index()) {
				nextSlideId = 0;
			}

			this.$slides.filter('.slide-carousel-previous').removeClass('slide-carousel-previous');
			this.$slides.filter('.slide-carousel-next').removeClass('slide-carousel-next');

			this.$slides.eq(nextSlideId)
				.removeAttr('style')
				.addClass('slide-carousel-next');
		},

		/**
		 * Set the previous slide for carousels
		 */
		setPreviousSlide: function () {
			var previousSlideId = this.activeSlide - 1;

			if (previousSlideId === -1) {
				previousSlideId = this.$slides.last().index() - 1;
			}

			this.$slides.filter('.slide-carousel-next').removeClass('slide-carousel-next');
			this.$slides.filter('.slide-carousel-previous').removeClass('slide-carousel-previous');

			this.$slides.eq(previousSlideId)
				.removeAttr('style')
				.addClass('slide-carousel-previous');
		},

		/**
		 * Set the last active slide
		 */
		setLastActive: function () {
			this.$slides.filter('.slide-carousel-last-active').removeClass('slide-carousel-last-active');

			// Add class from current element
			this.$slides.eq(this.prevActiveSlide).addClass('slide-carousel-last-active');
		},


		/**
		 * Shift direction
		 * @param  {direction} direction next or prev
		 */
		shift: function (direction) {
			var slideDirection = direction;

			//remember previous activeSlide
			this.prevActiveSlide = this.activeSlide;

			// Eject early if bullet clicked is same as the current image or there is only one slide
			if (this.prevActiveSlide === slideDirection || this.$slides.length === 1) {
				return false;
			}

			// Remove class active
			this.$slides.eq(this.prevActiveSlide).removeClass('active');


			if (!this.locked) {
				this.lock();

				// Deduce the proper activeImage
				if (direction === 'next') {
					this.activeSlide += 1;

					if (this.activeSlide === this.numberSlides) {
						this.activeSlide = 0;
					}

				} else if (direction === 'prev') {
					this.activeSlide -= 1;

					if (this.activeSlide < 0) {
						this.activeSlide = this.numberSlides - 1;
					}
				} else {
					this.activeSlide = direction;

					if (this.prevActiveSlide < this.activeSlide) {
						slideDirection = 'next';
					} else if (this.prevActiveSlide > this.activeSlide) {
						slideDirection = 'prev';
					}
				}

				// Do stuff before the slide changes
				if (this.options.beforeSlideChange) {
					this.options.beforeSlideChange.call(this, this.$slides.eq(this.activeSlide));
				}

				// Set to correct bullet
				this.setActiveBullet();

				// Fade
				if (this.options.animation === 'fade') {
					this.animations.fade.call(this);

				// Horizontal-slide
				} else if (this.options.animation === 'horizontal-slide') {
					this.animations.horizontalSlide.call(this, slideDirection);

				// Vertical-slide
				} else if (this.options.animation === 'vertical-slide') {
					this.animations.verticalSlide.call(this, slideDirection);

				// Horizontal-push
				} else if (this.options.animation === 'horizontal-push') {
					this.animations.horizontalPush.call(this, slideDirection);

				// Vertical-push
				} else if (this.options.animation === 'vertical-push') {
					this.animations.verticalPush.call(this, slideDirection);
				}


				if (this.options.carousel) {

					if (slideDirection === 'next') {
						this.setNextSlide();
					} else if (slideDirection === 'prev') {
						this.setPreviousSlide();
					}

					this.setLastActive();
				}

				this.setCaption();
			}
		},


		/**
		 * Get index of current slide
		 * @return {int} current slide
		 */
		getCurrentSlide: function () {
			return $('.slider-bullets > li').index('.active');
		},

		/**
		 * Touch events
		 */
		resetSlider: function () {
			this.$element[0].removeEventListener('touchmove', this.onTouchMove, false);
			this.$element[0].removeEventListener('touchend', this.onTouchEnd, false);

			this.startX = null;
			this.startY = null;
			this.dx = null;
		},

		onTouchStart: function (e) {

			// Don't do anything if touch events are turned off
			if (this.options.touchNavigation === false) {
				return false;
			}

			if (e.touches.length === 1) {
				this.$element[0].addEventListener('touchmove', this.onTouchMove, false);
				this.$element[0].addEventListener('touchend', this.onTouchEnd, false);

				this.startX = e.touches[0].pageX;
				this.startY = e.touches[0].pageY;
				this.cwidth = this.$element.height();
			}
		},

		onTouchMove: function (e) {
			var self = this;
			this.dx = this.startX - e.touches[0].pageX;
			this.scrolling = Math.abs(this.dx) < Math.abs(this.startY - e.touches[0].pageY);

			if (!this.scrolling) {
				e.preventDefault();

				self.dx = (function () {
					return self.dx / self.cwidth;
				}());
			} else {
				this.resetSlider();
			}
		},

		onTouchEnd: function () {
			var target;

			if (this.dx !== null) {
				if (this.dx > 0) {
					target = 'slider.next';
				} else {
					target = 'slider.prev';
				}

				if (Math.abs(this.dx) > 0.2 || Math.abs(this.dx) > this.cwidth / 2) {
					this.$element.trigger(target);
				}
			}

			// finish the touch by undoing the touch session
			this.resetSlider();
		}

	};


	/**
	 * Make it a plugin
	 */
	$.fn.slider = function (options) {
		return this.each(function () {
			var slider = $.extend({}, SLIDER);
			slider.init(this, options);
		});
	};

}(jQuery));


/**
 * jQuery imageready Plugin
 * http://www.zurb.com/playground/
 *
 * Copyright 2011, ZURB
 * Released under the MIT License
 */
(function ($) {
	'use strict';

	var options = {};

	var bindToLoad = function (element, callback) {
		var $element = $(element);

		$element.on('load.imageready', function () {
			callback.apply(element, arguments);
			$element.off('load.imageready');
		});
	};

	$.event.special.imageready = {

		setup: function (data) {
			options = data || options;
		},

		add: function (handleObj) {
			var $this = $(this),
					src;

			if ( this.nodeType === 1 && this.tagName.toLowerCase() === 'img' && this.src !== '' ) {
				if (options.forceLoad) {
					src = $this.attr('src');
					$this.attr('src', '');
					bindToLoad(this, handleObj.handler);
					$this.attr('src', src);
				} else if ( this.complete || this.readyState === 4 ) {
					handleObj.handler.apply(this, arguments);
				} else {
					bindToLoad(this, handleObj.handler);
				}
			}
		},

		teardown: function () {
			$(this).off('.imageready');
		}
	};

}(jQuery));


/*!
 * requestAnimationFrame plugin for jQuery
 * Please see https://gist.github.com/dantipa/3524146
 */
(function ($) {
	// requestAnimationFrame polyfill by Erik Möller
	// fixes from Paul Irish and Tino Zijdel

	'use strict';

	var lastTime = 0;
	var running;
	var animate = function (element) {
		if (running) {
			window.requestAnimationFrame(animate, element);
			$.fx.tick();
		}
	};
	var vendors = ['ms', 'moz', 'webkit', 'o'];

	for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
		window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
		window.cancelAnimationFrame = window[vendors[x]+'CancelAnimationFrame'] ||
		window[vendors[x]+'CancelRequestAnimationFrame'];
	}

	if (!window.requestAnimationFrame) {
		window.requestAnimationFrame = function (callback, element) {
			element = undefined;

			var currTime = new Date().getTime();
			var delta = currTime - lastTime;
			var timeToCall = Math.max(0, 16 - delta);

			var id = window.setTimeout(function () {
				callback(currTime + timeToCall);
			},timeToCall);

			lastTime = currTime + timeToCall;

			return id;
		};
	}

	if (!window.cancelAnimationFrame) {
		window.cancelAnimationFrame = function (id) {
			clearTimeout(id);
		};
	}

	$.fx.timer = function (timer) {
		if (timer() && $.timers.push(timer) && !running) {
			running = true;
			animate(timer.elem);
		}
	};

	$.fx.stop = function () {
		running = false;
	};

}(jQuery));
