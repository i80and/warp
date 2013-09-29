'use strict';

var xorshift = require('./xorshift');
var warp = require('./warpline');

var assign_tile = function(val) {
    return ((val+1)/2)*255;
}

self.onmessage = function(ev) {
    var width = ev.data.width;
    var height = ev.data.height;
    var seed = ev.data.seed;

    var result = new Uint8Array(width*height*4);

    var rng = new xorshift.RandomGenerator(seed);
    var p2d = new warp.Perlin2D(width, height, 1, 2, rng);

    var buf = new Float32Array(width);

    for(var y = 0; y < height; y += 1) {
        p2d.warpLine(y+0.5, 250, buf, width);

        for(var i = 0; i < width; i += 1) {
            var val = assign_tile(buf[i]);
            var offset = (i + y * width) * 4;
            result[offset] = val;
            result[offset + 1] = val;
            result[offset + 2] = val;
            result[offset + 3] = 255;
        }

        self.postMessage({'progress': y});
    }

    self.postMessage({'result': result.buffer}, [result.buffer]);
};
