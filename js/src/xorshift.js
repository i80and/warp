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
