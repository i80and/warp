;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var xorshift = require('./xorshift');
var warp = require('./warp');

var assign_tile = function(val) {
    return ((val+1)/2)*255;
}

self.onmessage = function(ev) {
    var width = ev.data.width;
    var height = ev.data.height;
    var seed = ev.data.seed;

    var buf = new Uint8Array(width*height*4);

    var rng = new xorshift.RandomGenerator(seed);
    var p2d = new warp.Perlin2D(width, height, 1, 2, rng);

    for(var y = 0; y < height; y += 1) {
        for(var x = 0; x < width; x += 1) {
            var val = p2d.warp(x+0.5, y+0.5, 250);
            val = assign_tile(val);
            var offset = (x + y * width) * 4;
            buf[offset+0] = val;
            buf[offset+1] = val;
            buf[offset+2] = val;
            buf[offset+3] = 255;
        }

        self.postMessage({'progress': y});
    }

    self.postMessage({'result': buf.buffer}, [buf.buffer]);
};

},{"./warp":2,"./xorshift":3}],2:[function(require,module,exports){
'use strict';

var Vec2 = function(x, y) {
    this.x = x;
    this.y = y;
};

Vec2.prototype.getLength = function() {
    return Math.sqrt(this.x*this.x + this.y*this.y);
};

Vec2.prototype.normalize = function() {
    var len = this.getLength();
    return new Vec2(this.x/len, this.y/len);
};

Vec2.prototype.add = function(other) {
    return new Vec2(this.x+other.x, this.y+other.y);
};

var ease = function(t) {
    return 6*(t*t*t*t*t) - 15*(t*t*t*t) + 10*(t*t*t);
};

var Perlin2D = function(width, height, persistence, scale, rng) {
    this.width = width;
    this.height = height;
    this.persistence = persistence;
    this.scale = scale;
    this.octaves = 8;
    this.grads = [];
    this.rnd = [];

    for(var i = 0; i < 256; i += 1) {
        this.rnd.push(rng.getRandom() % 255);
    }

    for(var i = 0; i < 256; i += 1) {
        this.grads[i] = new Vec2(rng.getUniform(), rng.getUniform()).normalize();
    }
};

Perlin2D.prototype.getGradient = function(x, y) {
    return this.grads[ ( (x>>>0) + this.rnd[(y>>>0)%256] ) % 256 ];
};

Perlin2D.prototype.noise = function(x, y) {
    var x0 = Math.floor(x);
    var x1 = Math.ceil(x);
    var y0 = Math.floor(y);
    var y1 = Math.ceil(y);

    var g_rand_x0_y1 = this.getGradient(x0, y1);
    var g_rand_x1_y1 = this.getGradient(x1, y1);
    var g_rand_x1_y0 = this.getGradient(x1, y0);
    var g_rand_x0_y0 = this.getGradient(x0, y0);

    // This unrolling is very necessary to avoid unnecessarily allocations (2x boost)
    // Each scaler (s, t, u, v) is a dot product: (v1.x * v2.x) + (v1.y * v2.y)
    var s = (g_rand_x0_y0.x * (x-x0)) + (g_rand_x0_y0.y * (y-y0));
    var t = (g_rand_x1_y0.x * (x-x1)) + (g_rand_x1_y0.y * (y-y0));
    var u = (g_rand_x0_y1.x * (x-x0)) + (g_rand_x0_y1.y * (y-y1));
    var v = (g_rand_x1_y1.x * (x-x1)) + (g_rand_x1_y1.y * (y-y1));

    var weight_x = ease(x-x0);
    var a = s + (weight_x * (t - s));
    var b = u + (weight_x * (v - u));

    var weight_y = ease(y-y0);

    return a + weight_y * (b - a);
};

Perlin2D.prototype.fbm = function(x, y) {
    var val = 0;
    var amplitude = this.persistence;
    var k = this.scale;

    for(var i = 0; i < this.octaves; i += 1) {
        var xcoord = x/(this.width/k);
        var ycoord = y/(this.height/k);
        val += this.noise(xcoord, ycoord) * amplitude;

        amplitude /= 2;
        k *= 2;
    }

    return val;
};

// Implements http://www.iquilezles.org/www/articles/warp/warp.htm
Perlin2D.prototype.warp = function(x, y, warp_factor) {
    var p = new Vec2(x, y);
    var q_y_vector = p.add(new Vec2(5.2, 1.3));
    var q = new Vec2(this.fbm(p.x, p.y), this.fbm(q_y_vector.x, q_y_vector.y));
    var result_vector = p.add(new Vec2(q.x*warp_factor, q.y*warp_factor));
    return this.fbm(result_vector.x, result_vector.y);
};

module.exports.Perlin2D = Perlin2D;

},{}],3:[function(require,module,exports){
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