module.exports = function (grunt) {

	'use strict';

	// Project configuration.
	grunt.initConfig({
		pkg: require('./package'),
		meta: {
			banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
			'<%= grunt.template.today("yyyy-mm-dd") %> */'
		},

		jshint: {
			all: [
				'Gruntfile.js',
				'jquery.slider.js'
			],
			options: {
				jshintrc: '.jshintrc'
			}
		},

		sass: {
			dist: {
				options: {
					style: 'compressed'
				},
				files: {
					'build/jquery.slider-<%= pkg.version %>.min.css': 'jquery.slider.scss'
				}

			}
		},

		uglify: {
			deploy: {
				src: 'jquery.slider.js',
				dest: 'build/jquery.slider-<%= pkg.version %>.min.js'
			}
		},

		watch: {

			scss: {
				files: ['jquery.slider.scss'],
				tasks: 'sass'
			},

			js: {
				files: [
					'Gruntfile.js',
					'jquery.slider.js'
				],
				tasks: ['jshint', 'uglify']
			}
		}
	});

	// Load some stuff
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-contrib-sass');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');

	// Default task
	grunt.registerTask('default', ['jshint', 'sass', 'uglify']);

};
