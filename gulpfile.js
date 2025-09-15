const { src, dest, watch, series, parallel } = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');
const sourcemaps = require('gulp-sourcemaps');
const browserSync = require('browser-sync').create();
const del = require('del');


const paths = {
    scss: 'src/scss/**/*.scss',
    html: 'src/*.html',
    js: 'src/js/**/*.js',
    images: 'src/img/**/*.{jpg,jpeg,png,svg,gif,webp}',
    dist: 'dist'
};


function clean() {
    return del([paths.dist]);
}


function styles() {
    return src('src/scss/style.scss')
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(cleanCSS({ level: 2 }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(sourcemaps.write('.'))
        .pipe(dest(paths.dist + '/css'))
        .pipe(browserSync.stream());
}

function images() {
    return src('src/img/**/*.{jpg,jpeg,png,svg,gif,webp}')
        .pipe(dest('dist/img'))
        .pipe(browserSync.stream());
}

function fonts() {
    return src('src/scss/_fonts.scss')
        .pipe(sourcemaps.init())
        .pipe(sass().on('error', sass.logError))
        .pipe(cleanCSS({ level: 2 }))
        .pipe(rename({ basename: 'fonts', suffix: '.min' }))
        .pipe(sourcemaps.write('.'))
        .pipe(dest(paths.dist + '/css'))
        .pipe(browserSync.stream());
}




function copyHtml() {
    return src(paths.html)
        .pipe(dest(paths.dist))
        .pipe(browserSync.stream());
}


function copyJs() {
    return src(paths.js)
        .pipe(dest(paths.dist + '/js'))
        .pipe(browserSync.stream());
}


function serve() {
    browserSync.init({
        server: { baseDir: 'dist' },
        port: 3000
    });
    watch(paths.scss, styles);
    watch(paths.html, copyHtml);
    watch(paths.js, copyJs);
    watch(paths.images, images);
}


exports.build = series(clean, parallel(styles, copyHtml, copyJs, images, fonts));
exports.dev = series(clean, parallel(styles, copyHtml, copyJs, images, fonts), serve);
exports.default = exports.dev;