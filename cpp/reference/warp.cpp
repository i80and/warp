#include <stdio.h>
#include <math.h>
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

    float s = g_rand_x0_y0.dot(Vec2(x-x0, y-y0));
    float t = g_rand_x1_y0.dot(Vec2(x-x1, y-y0));
    float u = g_rand_x0_y1.dot(Vec2(x-x0, y-y1));
    float v = g_rand_x1_y1.dot(Vec2(x-x1, y-y1));

    float weight_x = ease(x-x0);
    float a = s + (weight_x * (t - s));
    float b = u + (weight_x * (v - u));

    float weight_y = ease(y-y0);

    return a + weight_y * (b - a);
};

float Warp::fbm(float x, float y) const {
    float val = 0;
    float amplitude = _persistence;
    float k = _scale;

    for(int i = 0; i < OCTAVES; i += 1) {
        float xcoord = x / (_width/k);
        float ycoord = y / (_height/k);

        val += noise(xcoord, ycoord) * amplitude;

        amplitude /= 2;
        k *= 2;
    }

    return val;
}

// Implements http://www.iquilezles.org/www/articles/warp/warp.htm
float Warp::warp(float x, float y, float warp_factor) const {
    Vec2 p(x, y);
    Vec2 q_y_vector = p + Vec2(5.2, 1.3);
    Vec2 q(fbm(p.x(), p.y()), fbm(q_y_vector.x(), q_y_vector.y()));
    Vec2 result_vector = p + Vec2(q.x()*warp_factor, q.y()*warp_factor);

    return fbm(result_vector.x(), result_vector.y());
}

Vec2 Warp::getGradient(float x, float y) const {
    return _grads[ ( static_cast<unsigned int>(x) + _rnd[static_cast<unsigned int>(y) % 256] ) % 256 ];
}
