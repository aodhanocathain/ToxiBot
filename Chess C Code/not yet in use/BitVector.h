#pragma once

typedef long long int BitVector;

BitVector BitVector_make();

int BitVector_read(BitVector b, int i);
BitVector BitVector_write(BitVector b, int i);
BitVector BitVector_or(BitVector b1, BitVector b2);

void BitVector_print(BitVector b);