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
var watchify = require('watchify');
var gulpif = require('gulp-if');
var commonShake = require('common-shakeify');
var strip = require('gulp-strip-comments');

function setupBrowserify(watch) {
    var bundleOptions = {
        cache: {},
        packageCache: {},
        paths: ['./src'],
        standalone: 'XL',
        fullPaths: false,
        debug: true,
        transform: [["babelify", { "presets": ["es2015"], "plugins": ["transform-object-assign"] }]]
    };
    var bundler = browserify('./src/main.js', bundleOptions).plugin(commonShake);
    bundler.require('./src/main.js', {entry: true, expose: 'main'});

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
        .pipe(buffer())
        .pipe(strip({
            ignore: /\/\/#/g
        }))
        .pipe(gulp.dest('./dist'))
        .pipe(buffer())
        .pipe(rename('xl.min.js'))
        .pipe(sourcemaps.init({loadMaps: true})) // loads map from browserify file
        .pipe(uglify())
        .pipe(sourcemaps.write('./', {includeContent: true, sourceRoot: '.', debug: false})) // writes .map file
        .pipe(gulp.dest('./dist'))
        .pipe(gulpif(watch, browserSync.reload({stream: true, once: true})));
}

gulp.task('build', function (done) {
    setupBrowserify(false);
    done();
});

gulp.task('browser-sync', function () {
    browserSync({
        startPath: 'example/widget.html',
        server: {
            baseDir: './'
        },
        port: 9000,
        ghostMode: false
    });
});

gulp.task('serve', gulp.series(['browser-sync'], function () {
    setupBrowserify(true);

    gulp.watch(['example/*.html']).on('change', browserSync.reload); //all the other files are managed by watchify
}));