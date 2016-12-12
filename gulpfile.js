/**
 * Created by a.korotaev on 14.06.16.
 */

var gulp = require('gulp');
var gutil = require('gulp-util');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var sourcemaps = require('gulp-sourcemaps');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var browserSync = require('browser-sync');
var browserify = require('browserify');
var sassify = require('sassify');
var stringify = require('stringify');
var watchify = require('watchify');
var gulpif = require('gulp-if');
var plumber = require('gulp-plumber');
var traceur = require('gulp-traceur');

var Server = require('karma').Server;

function setupBrowserify(watch) {
    var bundleOptions = {
        cache: {},
        packageCache: {},
        paths: ['./src'],
        standalone: 'XL',
        fullPaths: false,
        debug: true,
        transform: [["babelify", { "presets": ["es2015"] }]]
    };
    var bundler = browserify('./src/main.js', bundleOptions);
    bundler.require('./src/main.js', {entry: true, expose: 'main'});
    bundler.require('./bower_components/jquery/dist/jquery.js', {expose: 'jquery'});
    // bundler.transform({
    //     outputStyle: 'compressed',
    //     base64Encode: false,
    //     'auto-inject': true
    // }, sassify);

    // bundler.transform(stringify({
    //     extensions: ['.svg'],
    //     minify: true,
    //     minifier: {
    //         extensions: ['.svg'],
    //         options: {
    //             removeComments: true,
    //             removeCommentsFromCDATA: true,
    //             removeCDATASectionsFromCDATA: true,
    //             collapseWhitespace: true
    //         }
    //     }
    // }));

    if (watch) {
        bundler = watchify(bundler);
        bundler.on('update', function () {  // on any dep update, runs the bundler
            runBundle(bundler, watch);
        });
    }

    runBundle(bundler, watch);
}

function runBundle(bundler, watch) {
    return bundler.bundle()
    // log errors if they happen
        .on('error', gutil.log.bind(gutil, 'Browserify Error'))
        .pipe(source('xl.js'))
        .pipe(gulp.dest('./dist'))
        .pipe(buffer())
        .pipe(rename('xl.min.js'))
        .pipe(sourcemaps.init({loadMaps: true})) // loads map from browserify file
        .pipe(uglify())
        .pipe(sourcemaps.write('./', {includeContent: true, sourceRoot: '.', debug: false})) // writes .map file
        .pipe(gulp.dest('./dist'))
        .pipe(gulpif(watch, browserSync.reload({stream: true, once: true})));
}

gulp.task('build', function () {
    setupBrowserify(false);
});

gulp.task('browser-sync', function () {
    browserSync({
        startPath: '/index.html',
        server: {
            baseDir: ['example', 'dist']
        },
        port: 9000,
        ghostMode: false
    });
});

gulp.task('serve', ['browser-sync'], function () {
    setupBrowserify(true);

    gulp.watch(['example/*.html']).on('change', browserSync.reload); //all the other files are managed by watchify
});

/**
 * Run test once and exit
 */
gulp.task('test', function (done) {
    new Server({
        configFile: __dirname + '/karma.conf.js',
        singleRun: true
    }, done).start();
});