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
				'jquery.orbit.js'
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
					'build/jquery.orbit-<%= pkg.version %>.min.css': 'jquery.orbit.scss'
				}

			}
		},

		uglify: {
			deploy: {
				src: 'jquery.orbit-<%= pkg.version %>.min.js',
				dest: 'build/jquery.orbit-<%= pkg.version %>.min.js'
			}
		},

		watch: {

			scss: {
				files: ['jquery.orbit.scss'],
				tasks: 'sass'
			},

			js: {
				files: [
					'Gruntfile.js',
					'jquery.orbit.js'
				],
				tasks: 'jshint'
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
