#include <stdio.h>
#include <math.h>
#include <string.h>
#include "warp.h"

static float ease(float t) {
    return 6*(t*t*t*t*t) - 15*(t*t*t*t) + 10*(t*t*t);
}

Warp::Warp(int width, int height, float persistence, int scale, RandomGenerator& rng) {
    _width = width;
    _height = height;
    _persistence = persistence;
    _scale = scale;

    for(int i = 0; i < 256; i += 1) {
        _rnd[i] = rng.getRandom() % 255;
    }

    for(int i = 0; i < 256; i += 1) {
        _grads[i] = Vec2(rng.getUniform(), rng.getUniform()).normalize();
    }
}

float Warp::noise(float x, float y) const {
    float x0 = floorf(x);
    float x1 = ceilf(x);
    float y0 = floorf(y);
    float y1 = ceilf(y);

    Vec2 g_rand_x0_y1 = getGradient(x0, y1);
    Vec2 g_rand_x1_y1 = getGradient(x1, y1);
    Vec2 g_rand_x1_y0 = getGradient(x1, y0);
    Vec2 g_rand_x0_y0 = getGradient(x0, y0);

    float s = (g_rand_x0_y0.x() * (x-x0)) + (g_rand_x0_y0.y() * (y-y0));
    float t = (g_rand_x1_y0.x() * (x-x1)) + (g_rand_x1_y0.y() * (y-y0));
    float u = (g_rand_x0_y1.x() * (x-x0)) + (g_rand_x0_y1.y() * (y-y1));
    float v = (g_rand_x1_y1.x() * (x-x1)) + (g_rand_x1_y1.y() * (y-y1));

    float weight_x = ease(x-x0);
    float a = s + (weight_x * (t - s));
    float b = u + (weight_x * (v - u));

    float weight_y = ease(y-y0);

    return a + weight_y * (b - a);
};

float Warp::fbm(float x, float y) const {
    float amplitude = _persistence;
    float k = _scale;
    float val = 0;

    for(int i = 0; i < OCTAVES; i += 1) {
        float xcoord = x / (_width/k);
        float ycoord = y / (_height/k);

        val += noise(xcoord, ycoord) * amplitude;

        amplitude /= 2;
        k *= 2;
    }

    return val;
}

void Warp::fbmLine(float y, float xOffset, float* buf, int outWidth) const {
    float amplitude = _persistence;
    float k = _scale;

    memset(buf, 0, sizeof(float)*outWidth);

    for(int octave = 0; octave < OCTAVES; octave += 1) {
        float x = xOffset;

        for(int i = 0; i < outWidth; i += 1) {
            float xcoord = x / (_width/k);
            float ycoord = y / (_height/k);

            buf[i] += noise(xcoord, ycoord) * amplitude;

            x += 1;
        }

        amplitude /= 2;
        k *= 2;
    }
}

// Implements http://www.iquilezles.org/www/articles/warp/warp.htm
void Warp::warpLine(float y, float warp_factor, float* buf, int outWidth) const {
    float buf1[outWidth];
    float buf2[outWidth];

    fbmLine(y, 0, buf1, outWidth);
    fbmLine(y+1.3, 5.2, buf2, outWidth);

    for(int x = 0; x < outWidth; x += 1) {
        Vec2 result_vector = Vec2(x + buf1[x]*warp_factor, y + buf2[x]*warp_factor);
        buf[x] = fbm(result_vector.x(), result_vector.y());
    }
}

Vec2 Warp::getGradient(float x, float y) const {
    return _grads[ ( static_cast<unsigned int>(x) + _rnd[static_cast<unsigned int>(y) % 256] ) % 256 ];
}
