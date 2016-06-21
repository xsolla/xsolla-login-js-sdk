/**
 * Created by a.korotaev on 14.06.16.
 */
var lr = require('tiny-lr');
var gulp = require('gulp');
var serve = require('gulp-serve');
var connect = require('connect');
var livereload = require('gulp-livereload');
var concat = require('gulp-concat');
var server = lr();


gulp.task('js', function () {
    return gulp.src(jsPaths)
        .pipe(concat('currency-format.js'))
        .pipe(replace('@@includeJSON', includeJSON))
        .pipe(traceur())
        .pipe(gulp.dest('.tmp/bower_components/angular-currency-format/dist/'));
});

gulp.task('html', function () {
    return gulp.src('src/index.html')
        .pipe(gulp.dest('.tmp/'));
});

// gulp.task('work', function () {
//
// });
//
// // Собираем JS
// gulp.task('js', function() {
//     gulp.src(['./src/js/**/*.js'])
//         .pipe(concat('xsolla-login.js')) // Собираем все JS, кроме тех которые находятся в ./assets/js/vendor/**
//         .pipe(gulp.dest('./public/js'))
//         .pipe(livereload(server)); // даем команду на перезагрузку страницы
// });
//
// gulp.task('html', function() {
//     gulp.src(['./src/**/*.html'])
//         .pipe();
// });
//
// gulp.task('http-server', function() {
//     connect()
//         .use(require('connect-livereload')())
//         .use(connect.static('./public'))
//         .listen('9000');
//
//     console.log('Server listening on http://localhost:9000');
// });