#pragma once

#include <math.h>
#include <stdint.h>
#include <limits>

typedef uint8_t byte;

class NonCopyable {
    protected:
    NonCopyable() {}
    ~NonCopyable() {}

    private:
    NonCopyable(const NonCopyable&);
    NonCopyable& operator= (const NonCopyable&);
};

// 64-byte xorshift using (17, 47, 29)
inline uint64_t random64(uint64_t x) {
    x ^= (x << 29);
    x ^= (x >> 47);
    x ^= (x << 17);
    return x;
}

class RandomGenerator {
public:
    RandomGenerator(uint64_t seed): _seed(seed) {
        getRandom();
    }

    uint64_t getRandom() {
        _seed = random64(_seed);
        return _seed;
    }

    float getUniform() {
        return (static_cast<float>(getRandom()) / (std::numeric_limits<uint64_t>::max()/2)) - 1.0;
    }

private:
    uint64_t _seed;
};

class Vec2 {
public:
    Vec2(): _x(0), _y(0) {}
    Vec2(float initX, float initY): _x(initX), _y(initY) {}
    Vec2(const Vec2& other): _x(other._x), _y(other._y) {}

    float length() const {
        return sqrtf(_x*_x + _y*_y);
    }

    Vec2 normalize() const {
        float len = length();
        return Vec2(_x/len, _y/len);
    }

    Vec2 operator+(const Vec2& other) const {
        return Vec2(_x+other._x, _y+other._y);
    }

    float dot(const Vec2& other) const {
        return (_x*other.x()) + (_y*other.y());
    }

    float x() const { return _x; }
    float y() const { return _y; }

private:
    float _x;
    float _y;
};

class Warp: public NonCopyable {
public:
    Warp(int width, int height, float persistence, int scale, RandomGenerator& rng);

    float noise(float x, float y) const;
    float fbm(float x, float y) const;
    void fbmLine(float y, float xOffset, float* buf, int outWidth) const;
    void warpLine(float y, float warp_factor, float* buf, int outWidth) const;

private:
    int _width;
    int _height;
    float _persistence;
    int _scale;

    byte _rnd[256];
    Vec2 _grads[256];

    static const int OCTAVES = 8;

    Vec2 getGradient(float x, float y) const;
};
