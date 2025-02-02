#!/usr/bin/env node

/* 

creates a highly compressed release build in bin of the contents of src

packages used:

npm i inliner ncp rimraf compress-images gifsicle glob concat ycssmin terser html-minifier-terser gzipper
*/

const fs = require("fs");
const path = require('path');
const rimraf = require('rimraf');
const compress_images = require("compress-images");
const Inliner = require('inliner');
const ncp = require('ncp').ncp;
const {execFileSync} = require('child_process');
const gifsicle = require('gifsicle');
const concat = require('concat');
const cssmin = require('ycssmin').cssmin;
const { minify } = require("terser");
const { Compress } = require('gzipper');            
const htmlminify = require('html-minifier-terser').minify;
const glob = require("glob")

var lines = fs.readFileSync(".build/buildnumber.txt",encoding='utf-8');
var buildnum = parseInt(lines);
buildnum++;
fs.writeFileSync(".build/buildnumber.txt",buildnum.toString(),encoding='utf-8');


//#node-qunit-phantomjs  tests/tests.html --timeout 40
console.log("===========================");
console.log('build number '+buildnum)

var start = new Date()

// console.log("clearing whitepsace from demos")
// cd demo
// find . -type f \( -name "*.txt" \) -exec perl -p -i -e "s/[ \t]*$//g" {} \;
// cd ..

console.log("removing bin")


fs.rmdirSync("./bin", { recursive: true });

fs.mkdirSync('./bin');

console.log("inlining standalone template")


new Inliner('./src/standalone.html', function (error, html) {
  // compressed and inlined HTML page
  fs.writeFileSync("./src/standalone_inlined.txt",html,'utf8');

  console.log("Copying files")
  ncp.limit = 16;
  ncp("./src", "./bin/", function (err) {
    if (err) {
      return console.error(err);
    }
    console.log("echo optimizing pngs");

    rimraf.sync('./bin/images/*.png');

    (async () => {


        compress_images(
            "./src/images/*.png", 
            "./bin/images/", 
            { compress_force: false, statistic: false, autoupdate: true }, false,
            { jpg: { engine: "mozjpeg", command: ["-quality", "60"] } },
            { png: { engine: "pngcrush", command: ["-reduce", "-brute"] } },
            { svg: { engine: "svgo", command: "--multipass" } },
            { gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] } },
            
            function (error, completed, statistic) {
                // console.log("-------------");
                // console.log(error);
                // console.log(completed);
                // console.log(statistic);
                // console.log("-------------");
            }
        );
    


        
        console.log('Optimizing gallery gifs');

        const galGifDir = "./bin/Gallery/gifs";

        fs.readdirSync(galGifDir).forEach(file => {
          if (fs.lstatSync(path.resolve(galGifDir, file)).isDirectory()) {
          } else {
            if (path.extname(file).toLowerCase()=== ".gif"){
                execFileSync(gifsicle, ['--batch','-O2',galGifDir+"/"+file])
            }
          }
        });


        console.log('Optimizing documentation gifs');
        
        glob("./bin/Documentation/images/*.gif", {}, async function (er, files) {
            for (filename of files){
                execFileSync(gifsicle, ['-O2','-o', filename, filename]);
            }

            
            console.log('Images optimized');


                        
            fs.rmdirSync("./bin/js", { recursive: true });
            fs.mkdirSync('./bin/js');
            fs.rmdirSync("./bin/css", { recursive: true });
            fs.mkdirSync('./bin/css');
            fs.rmdirSync("./bin/tests", { recursive: true });
            fs.rmdirSync("./bin/Levels", { recursive: true });

            console.log('compressing css');


            await concat(["./src/css/docs.css", 
                "./src/css/codemirror.css", 
                "./src/css/midnight.css", 
                "./src/css/console.css", 
                "./src/css/gamecanvas.css", 
                "./src/css/soundbar.css", 
                "./src/css/layout.css", 
                "./src/css/toolbar.css", 
                "./src/css/dialog.css", 
                "./src/css/show-hint.css"], 
                "./bin/css/combined.css");

            console.log('css files concatenated')


            var css = fs.readFileSync("./bin/css/combined.css", encoding='utf8');
            var min = cssmin(css);
            fs.writeFileSync("./bin/css/combined.css",min,encoding="utf8");
            

            var css = fs.readFileSync("./bin/Documentation/css/bootstrap.css", encoding='utf8');
            var min = cssmin(css);
            fs.writeFileSync("./bin/Documentation/css/bootstrap.css",min,encoding="utf8");

            console.log("running js minification");

            var files = [  
                    "./src/js/Blob.js",
                    "./src/js/FileSaver.js",
                    "./src/js/jsgif/LZWEncoder.js",
                    "./src/js/jsgif/NeuQuant.js",
                    "./src/js/jsgif/GIFEncoder.js",
                    "./src/js/storagewrapper.js",
                    "./src/js/debug.js",
                    "./src/js/globalVariables.js",
                    "./src/js/font.js",
                    "./src/js/rng.js",
                    "./src/js/riffwave.js",
                    "./src/js/sfxr.js",
                    "./src/js/codemirror/codemirror.js",
                    "./src/js/codemirror/active-line.js",
                    "./src/js/codemirror/dialog.js",
                    "./src/js/codemirror/search.js",
                    "./src/js/codemirror/searchcursor.js",
                    "./src/js/codemirror/match-highlighter.js",
                    "./src/js/codemirror/show-hint.js",
                    "./src/js/codemirror/anyword-hint.js",
                    "./src/js/codemirror/comment.js",
                    "./src/js/colors.js",
                    "./src/js/graphics.js",
                    "./src/js/inputoutput.js",
                    "./src/js/mobile.js",
                    "./src/js/buildStandalone.js",
                    "./src/js/engine.js",
                    "./src/js/parser.js",
                    "./src/js/editor.js",
                    "./src/js/compiler.js",
                    "./src/js/console.js",
                    "./src/js/soundbar.js",
                    "./src/js/toolbar.js",
                    "./src/js/layout.js",
                    "./src/js/addlisteners.js",
                    "./src/js/addlisteners_editor.js",
                    "./src/js/solver.js",
                    "./src/js/FastPriorityQueue.js",
                    "./src/js/makegif.js"];

            var corpus={};
            for (var i=0;i<files.length;i++){
                var fpath=files[i];
                corpus["source/"+fpath.slice(9)]=fs.readFileSync(fpath,encoding='utf-8');
            }
            var result = await minify(
                corpus, 
                {
                    sourceMap: {
                    filename: "scripts_compiled.js",
                    url: "scripts_compiled.js.map"
                    }
                });
            fs.writeFileSync('./bin/js/scripts_compiled.js',result.code);
            fs.writeFileSync('./bin/js/scripts_compiled.js.map',result.map);


            files = [  
                "./src/js/storagewrapper.js",
                "./src/js/globalVariables.js",
                "./src/js/debug_off.js",
                "./src/js/font.js",
                "./src/js/rng.js",
                "./src/js/riffwave.js",
                "./src/js/sfxr.js",
                "./src/js/codemirror/stringstream.js",
                "./src/js/colors.js",
                "./src/js/graphics.js",
                "./src/js/engine.js",
                "./src/js/parser.js",
                "./src/js/compiler.js",
                "./src/js/inputoutput.js",
                "./src/js/mobile.js"];

            
            corpus={};
            for (var i=0;i<files.length;i++){
                var fpath=files[i];
                corpus["source/"+fpath.slice(9)]=fs.readFileSync(fpath,encoding='utf-8');
            }
            
            var result = await minify(
                corpus, 
                {
                    sourceMap: {
                    filename: "scripts_play_compiled.js",
                    url: "scripts_play_compiled.js.map"
                    }
                });
            fs.writeFileSync('./bin/js/scripts_play_compiled.js',result.code);
            fs.writeFileSync('./bin/js/scripts_play_compiled.js.map',result.map);
                    
            await ncp("./src/js", "./bin/js/source", function (err) {
                if (err) {
                return console.error(err);
            }});

            console.log("compilation done");

            var editor = fs.readFileSync("./bin/editor.html", encoding='utf8');
            editor = editor.replace(/<script src="js\/[A-Za-z0-9_\/-]*\.js"><\/script>/g, "");
            editor = editor.replace(/<!--TOREPLACE-->/g, '<script src="js\/scripts_compiled.js"><\/script>');
            editor = editor.replace(/<link rel="stylesheet" href="[A-Za-z0-9_\/-]*\.css">/g, '');
            editor = editor.replace(/<!--CSSREPLACE-->/g, '<link rel="stylesheet" href="css\/combined.css">');
            d = new Date();
            const monthname = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
            editor = editor.replace(/<!--BUILDNUMBER-->/g,`build ${buildnum.toString()}, ${d.getDate()}-${monthname[d.getMonth()]}-${d.getFullYear()}`);
            fs.writeFileSync("./bin/editor.html",editor, encoding='utf8');

            var player = fs.readFileSync("./bin/play.html", encoding='utf8');
            player = player.replace(/<script src="js\/[A-Za-z0-9_\/-]*\.js"><\/script>/g, "");
            player = player.replace(/<!--TOREPLACE-->/g, '<script src="js\/scripts_play_compiled.js"><\/script>');
            fs.writeFileSync("./bin/play.html",player, encoding='utf8');

            console.log("compressing html");
            
            
            glob("./bin/*.html", {}, async function (er, files) {
                for (filename of files){
                    var lines=fs.readFileSync(filename, encoding='utf8');
                    var result = await htmlminify(lines);
                    fs.writeFileSync(filename,result);
                }
            });

            
            (async function a() {
            
                files = glob.sync("./bin/**/*.js");
                files = files.concat(glob.sync("./bin/**/*.html"));
                files = files.concat(glob.sync("./bin/**/*.css"));
                files = files.concat(glob.sync("./bin/**/*.txt"));
            
                var compressionTasks = files.map( fn=>new Compress(fn));
                var compressed = await Promise.all(compressionTasks.map(gzip=>gzip.run()));
            
                console.log("Files compressed. All good!");

            
            })();

          });


    })();

    });


});


/*
echo gzipping site
cd ../bin
./gzipper
rm README.md
rm gzipper
rm commit
cd ../src
end=`date +%s`
runtime=$((end-start))
time=`date "+%H:%M:%S"`
echo script end time : $time 
echo script took $runtime seconds
echo ===========================
*/