;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var xorshift = require('./xorshift');

var NoiseGenerator = function() {
    this.worker = null;
    this.subGenerator = null;

    this.onprogress = function(p) {};
    this.ondone = function(result) {};
};

NoiseGenerator.prototype.generate = function(seed, width, height, type, options) {
    var _this = this;
    this.stop();
    var time = new Date();

    if(type === undefined) type = 'warp';
    if(type !== 'warp' && type !== 'fbm') throw 'Invalid noise type ' + type;

    if(options === undefined) options = {};

    this.worker = new Worker('main_worker.js');

    this.worker.addEventListener('message', function(ev) {
        if(ev.data.progress !== undefined) {
            _this.onprogress(ev.data.progress / height);
        }
        else if(ev.data.result !== undefined) {
            var enlapsed = (new Date() - time)/1000;
            console.log('Done in ' + enlapsed + 's');
            _this.ondone(new Uint8Array(ev.data.result));
        }
        else {
            console.error('Received unknown message');
        }
    }, false);

    this.worker.postMessage({
        'seed': seed,
        'width': width,
        'height': height,
        'type': type,
        'options': options
    });
};

NoiseGenerator.prototype.generateImage = function(seed, width, height, type, options) {
    var _this = this;

    this.subGenerator = new NoiseGenerator();
    this.subGenerator.generate(seed, width, height, type, options);
    this.subGenerator.onprogress = this.onprogress;
    this.subGenerator.ondone = function(result) {
        var finalBuf = new Uint8Array(width*height*4);

        for(var i = 0; i < width*height; i += 1) {
            var outputOffset = i*4;

            finalBuf[outputOffset] = result[i];
            finalBuf[outputOffset+1] = result[i];
            finalBuf[outputOffset+2] = result[i];
            finalBuf[outputOffset+3] = 255;
        }

        _this.ondone(finalBuf);
    };
};

NoiseGenerator.prototype.stop = function() {
    if(this.worker !== null) {
        this.worker.terminate();
        this.worker = null;
    }

    if(this.subGenerator !== null) {
        this.subGenerator.stop();
        this.subGenerator = null;
    }

};

var MapGenerator = function() {
    this.topologyGenerator = new NoiseGenerator();
    this.moistureGenerator = new NoiseGenerator();
    this.treeGenerator = new NoiseGenerator();

    this.onprogress = function(p) {};
    this.ondone = function(result) {};
    this.oncomponent = function(name, result) {};
};

var BIOME_WATER = 0;
var BIOME_SHALLOW_WATER = 1;
var BIOME_BEACH = 2;
var BIOME_ALPINE = 3;
var BIOME_ALPINE_TREE = 4;
var BIOME_MOUNTAIN_PEAK = 5;
var BIOME_FOREST = 6;
var BIOME_FOREST_TREE = 7;
var BIOME_PLAIN = 8;
var BIOME_PLAIN_TREE = 9;
var BIOME_DESERT = 10;
var BIOMES = [
    [0, 0, 255],        // Water
    [50, 50, 255],      // Shallow water
    [255, 255, 0],      // Beach
    [152, 255, 160],    // Alpine
    [52, 255, 68],      // Alpine Tree
    [255, 255, 255],    // Mountain Peak
    [0, 255, 0],        // Forest
    [0, 200, 0],        // Forest tree
    [232, 180, 107],    // Plain
    [157, 209, 137],    // Plain Tree
    [255, 255, 0]       // Desert
]
MapGenerator.prototype.generateImage = function(seed, width, height, options) {
    var _this = this;

    if(options === undefined) options = {};
    if(options.moisture === undefined) options.moisture = 0.0;
    if(options.elevation === undefined) options.elevation = 0.0;

    var maps = {};
    var finalBuf = new Uint8Array(width*height*4);
    var generationDone = function(name, result) {
        maps[name] = result;

        var treeRng = new xorshift.RandomGenerator(seed+3);
        if(maps['topology'] && maps['moisture'] && maps['trees']) {
            var topologyMap = maps['topology'];
            var moistureMap = maps['moisture'];
            var treesMap = maps['trees'];

            var outputOffset = 0;
            for(var i = 0; i < width*height; i += 1) {
                var moisture = moistureMap[i] + options.moisture;
                var topology = topologyMap[i] + options.elevation;
                var trees = treesMap[i];

                var biome;

                if(topology < 100) biome = BIOME_WATER
                else if(topology < 110) biome = BIOME_SHALLOW_WATER;
                else if(topology < 115) biome = BIOME_BEACH;
                else if(topology > 200) biome = BIOME_MOUNTAIN_PEAK;
                else if(topology > 160) biome = BIOME_ALPINE;
                else {
                    if(moisture < 50) biome = BIOME_DESERT;
                    else if(moisture < 100) biome = BIOME_PLAIN;
                    else biome = BIOME_FOREST;
                }

                var haveTree = false;
                if(topology > 115 && topology < 200) {
                    var treeFactor = ((trees / 255) - 0.5) * 2 * 10;
                    var moistureFactor = ((moisture / 255) - 0.5) * 2 * 2;
                    var topologyFactor = ((topology / 255) - 0.5) * 2 * 2;

                    var treeProbability = (topologyFactor*1.5 - moistureFactor - treeFactor/4)/1.2;

                    treeProbability = Math.max(treeProbability, -0.6);
                    haveTree = treeRng.getUniform() > treeProbability;
                }
                if(haveTree) {
                    if(biome === BIOME_FOREST) biome = BIOME_FOREST_TREE;
                    else if(biome === BIOME_PLAIN) biome = BIOME_PLAIN_TREE;
                    else if(biome === BIOME_ALPINE) biome = BIOME_ALPINE_TREE;
                }

                finalBuf[outputOffset] = BIOMES[biome][0];
                finalBuf[outputOffset+1] = BIOMES[biome][1];
                finalBuf[outputOffset+2] = BIOMES[biome][2];
                finalBuf[outputOffset+3] = 255;
                outputOffset += 4;
            }

            _this.ondone(finalBuf);
        }
    };

    var progressReports = {'topology': 0.0, 'moisture': 0.0, 'trees': 0.0};
    var handleSubProgress = function(name, p) {
        progressReports[name] = p;
        _this.onprogress(Math.min(progressReports['topology'], progressReports['moisture'], progressReports['trees']));
    };

    this.topologyGenerator.generate(seed, width, height, 'warp', {'strength': 350});
    this.topologyGenerator.onprogress = function(p) {
        handleSubProgress('topology', p);
    };
    this.topologyGenerator.ondone = function(result) {
        generationDone('topology', result);
        _this.oncomponent('topology', result);
    };

    this.moistureGenerator.generate(seed+1, width, height, 'fbm', {'octaves': 4});
    this.moistureGenerator.onprogress = function(p) {
        handleSubProgress('moisture', p);
    };
    this.moistureGenerator.ondone = function(result) {
        generationDone('moisture', result);
        _this.oncomponent('moisture', result);
    };

    this.treeGenerator.generate(seed+2, width, height, 'warp', {'strength': 750, 'octaves': 4});
    this.treeGenerator.onprogress = function(p) {
        handleSubProgress('trees', p);
    };
    this.treeGenerator.ondone = function(result) {
        generationDone('trees', result);
        _this.oncomponent('trees', result);
    };
};

MapGenerator.prototype.stop = function() {
    this.topologyGenerator.stop();
    this.moistureGenerator.stop();
    this.treeGenerator.stop();
};

/// Meta-generator wrapper that allows only a single generator to be running at once
var SingleGenerator = function(generator) {
    this.generator = null;
    this.setGenerator(generator);

    this.ondone = function(result) {};
    this.onprogress = function(p) {};
};

SingleGenerator.prototype.setGenerator = function(generator) {
    var _this = this;

    this.stop();
    this.generator = generator;

    this.generator.onprogress = function(p) {
        _this.onprogress(p);
    };
    this.generator.ondone = function(result) {
        _this.ondone(result);
    };
};

SingleGenerator.prototype.generateImage = function(seed, width, height, options) {
    this.generator.generateImage(seed, width, height, options);
};

SingleGenerator.prototype.stop = function() {
    if(this.generator !== null) {
        this.generator.stop();
    }
};

var createImage = function(generator, seed, options) {
    console.log('Generating with seed ' + seed);

    var progressElement = document.getElementById('progress-bar');
    var canvasElement = document.getElementById('draw');
    var ctx = canvasElement.getContext('2d');

    var width = canvasElement.width;
    var height = canvasElement.height;

    generator.generateImage(seed, width, height, options);

    generator.onprogress = function(p) {
        progressElement.value = p * 100;
    };
    generator.ondone = function(result) {
        progressElement.value = 100;

        var imageData = ctx.createImageData(width, height);
        imageData.data.set(result);
        ctx.putImageData(imageData, 0, 0);
    };
    generator.generator.oncomponent = function(name, result) {
        var canvasId;
        if(name === 'topology') canvasId = 'topologyMap';
        else if(name === 'moisture') canvasId = 'moistureMap';
        else if(name === 'trees') canvasId = 'treeMap';
        else throw 'Unknown result component "' + name + '"';

        var componentCanvasElement = document.getElementById(canvasId);
        var componentCtx = componentCanvasElement.getContext('2d');
        var imageData = componentCtx.createImageData(width, height);

        for(var i = 0; i < width*height; i += 1) {
            var outputOffset = i*4;
            imageData.data[outputOffset] = result[i];
            imageData.data[outputOffset+1] = result[i];
            imageData.data[outputOffset+2] = result[i];
            imageData.data[outputOffset+3] = 255;
        }
        componentCtx.putImageData(imageData, 0, 0);
    };
};

window.onload = function() {
    var moistureElement = document.getElementById('moisture-input');
    var elevationElement = document.getElementById('elevation-input');
    var seedElement = document.getElementById('seed-input');
    var canvasElement = document.getElementById('draw');
    var generator = new SingleGenerator(new MapGenerator());

    var seed = parseInt(seedElement.value);
    document.getElementById('generate-map-button').onclick = function() {
        var newSeed = parseInt(seedElement.value);
        if(seed === newSeed || isNaN(newSeed)) {
            seed = new Date().getTime();
            seedElement.value = seed;
        }
        else {
            seed = newSeed;
        }

        var options = {};
        options.moisture = parseFloat(moistureElement.value);
        options.elevation = parseFloat(elevationElement.value);

        generator.generator.stop();
        generator.setGenerator(new MapGenerator());
        createImage(generator, seed, options);

        return false;
    };

    createImage(generator, seed);
};

},{"./xorshift":2}],2:[function(require,module,exports){
'use strict';

// xorshift with triplet (5, 13, 6)
var random32 = function(x) {
    x ^= (x << 6) >>> 0;
    x ^= (x >>> 13) >>> 0;
    x ^= (x << 5) >>> 0;
    return x >>> 0;
};

var RandomGenerator = function(seed) {
    if(seed <= 0) {
        throw new RangeError('Seed must be >0');
    }

    this.seed = seed;
};

RandomGenerator.prototype.getRandom = function() {
    this.seed = random32(this.seed);
    return this.seed;
};

RandomGenerator.prototype.getUniform = function() {
    return (this.getRandom())/(4294967295/2) - 1.0;
};

module.exports.RandomGenerator = RandomGenerator;

},{}]},{},[1])
;