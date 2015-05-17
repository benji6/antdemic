const autoprefixer = require('gulp-autoprefixer');
const babel = require('gulp-babel');
const buffer = require('vinyl-buffer');
const browserify = require('browserify');
const gulp = require('gulp');
const gutil = require('gulp-util');
const minifyCSS = require('gulp-minify-css');
const minifyHTML = require('gulp-minify-html');
const plumber = require('gulp-plumber');
const R = require('ramda');
const sass = require('gulp-sass');
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
const watchify = require('watchify');

const HTML_PATH = "src/html/index.html";
const JS_PATH = "src/js/main.js";
const SASS_PATH = "src/sass/style.scss";
const DIST_PATH = "dist";

gulp.task("html", function () {
  gulp.src(HTML_PATH)
    .pipe(minifyHTML())
    .pipe(gulp.dest(DIST_PATH));
});

gulp.task("jsDev", function () {
  const bundler = watchify(browserify(JS_PATH, R.assoc("debug", true, watchify.args)));

  bundler.bundle()
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source("bundle.js"))
    .pipe(plumber())
    .pipe(buffer())
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist'));
});

gulp.task("jsProd", function () {
  const bundler = browserify({
    entries: JS_PATH
  });

  bundler.bundle()
    .on('error', gutil.log.bind(gutil, 'Browserify Error'))
    .pipe(source("bundle.js"))
    .pipe(buffer())
    .pipe(babel())
    .pipe(uglify())
    .pipe(gulp.dest('dist'));
});

gulp.task("sass", function () {
  gulp.src(SASS_PATH)
    .pipe(plumber())
    .pipe(sass())
    .pipe(autoprefixer({
      browsers: ["> 1%", "last 3 versions"],
      cascade: false
    }))
    .pipe(minifyCSS())
    .pipe(gulp.dest(DIST_PATH));
});

gulp.task("watch", function () {
  gulp.start("jsDev", "html", "sass");
  gulp.watch("src/js/**/*.js", ["jsDev"]);
  gulp.watch(HTML_PATH, ["html"]);
  gulp.watch(SASS_PATH, ["sass"]);
});

gulp.task("build", ["jsProd", "html", "sass"]);
gulp.task("default", ["watch"]);
