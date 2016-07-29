'use strict';
var istanbul = require('browserify-istanbul');

module.exports = function(karma) {
    karma.set({

        frameworks: [ 'browserify' ,  'jasmine'],

        files: [
            'src/**/*.js',
            // 'src/**/xlapi.js',
            // 'src/**/main.js',
            // 'dist/xl.js',
            'test/**/*Spec.js'
        ],

        reporters: [ 'coverage', 'dots', 'progress'],

        preprocessors: {
            'test/**/*Spec.js': [ 'browserify' ],
            'src/**/*.js': ['browserify', 'coverage' ]
            // 'src/**/main.js': ['browserify']
        },

        browsers: [ 'PhantomJS' ],

        logLevel: 'LOG_DEBUG',

        singleRun: true,
        autoWatch: false,

        // browserify configuration
        browserify: {
            debug: true,
            transform: [ 'brfs', 'browserify-shim' , istanbul({
                ignore: ['**/node_modules/**', '**/test/**']
            })]
        },
        coverageReporter: {
            reporters: [
                {type: 'html'},
                {type: 'cobertura'}
            ]
        }
    });
};