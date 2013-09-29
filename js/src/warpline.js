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

Perlin2D.prototype.fbmLine = function(y, xOffset, outBuf, outWidth) {
    var amplitude = this.persistence;
    var k = this.scale;

    for(var i = 0; i < outWidth; i += 1) {
        outBuf[i] = 0;
    }

    for(var octave = 0; octave < this.octaves; octave += 1) {
        var x = xOffset;

        for(var i = 0; i < outWidth; i += 1) {
            var xcoord = x / (this.width/k);
            var ycoord = y / (this.height/k);

            outBuf[i] += this.noise(xcoord, ycoord) * amplitude;

            x += 1;
        }

        amplitude /= 2;
        k *= 2;
    }
};

// Implements http://www.iquilezles.org/www/articles/warp/warp.htm
Perlin2D.prototype.warpLine = function(y, warp_factor, outBuf, outWidth) {
    var buf1 = new Float32Array(outWidth);
    var buf2 = new Float32Array(outWidth);

    this.fbmLine(y, 0, buf1, outWidth);
    this.fbmLine(y+1.3, 5.2, buf2, outWidth);

    for(var x = 0; x < outWidth; x += 1) {
        var resX = x + buf1[x]*warp_factor;
        var resY = y + buf2[x]*warp_factor;
        outBuf[x] = this.fbm(resX, resY);
    }
};

module.exports.Perlin2D = Perlin2D;
