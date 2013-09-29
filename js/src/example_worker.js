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
