#include <stdio.h>
#include <stdlib.h>
#include <string>
#include "warp.h"

void _assert(bool success, const char* cond, const char* file, int line) {
    if(!success) {
        fprintf(stderr, "Assert failed at %s:%d: %s\n", file, line, cond);
        exit(1);
    }
}
#define verify(cond) (_assert((cond), #cond, __FILE__, __LINE__))

byte assign_tile(float val) {
    return ((val+1)/2) * 255;
}

void writePGM(const std::string& path, int width, int height, byte* data, size_t dataLen) {
    FILE* f = fopen(path.c_str(), "w");
    fprintf(f, "P2\n%d\n%d\n255\n", width, height);

    for(int y = 0; y < height; y += 1) {
        for(int x = 0; x < width; x += 1) {
            size_t i = (y*width) + x;
            verify(i < dataLen);
            fprintf(f, "%d ", data[i]);
        }
        fprintf(f, "\n");
    }

    fclose(f);
}

int main(int argc, char** argv) {
    const int width = 2048;
    const int height = 2048;

    RandomGenerator rng(57832993247655);
    Warp warper(512, 512, 1.0, 2, rng);

    byte* result = new byte[width*height];

    int i = 0;
    for(int y = 0; y < height; y += 1) {
        for(int x = 0; x < width; x += 1) {
            result[i] = assign_tile(warper.warp(x, y, 250));
            i += 1;
        }
    }

    writePGM("out.pgm", width, height, result, width*height);

    delete[] result;

    return 0;
}
