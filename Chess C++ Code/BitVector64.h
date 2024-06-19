#pragma once

namespace BitVector64 {
	typedef unsigned long long int bitvector64_t;

	bitvector64_t zeroes();

	bitvector64_t set(bitvector64_t bv, int index);
	bitvector64_t clear(bitvector64_t bv, int index);

	int read(bitvector64_t bv, int index);
	bitvector64_t write(bitvector64_t bv, int index, int value);

	bitvector64_t invert(bitvector64_t bv);

	bitvector64_t bitwiseAnd(bitvector64_t bv1, bitvector64_t bv2);
	bitvector64_t bitwiseOr(bitvector64_t bv1, bitvector64_t bv2);

	bool isEmpty(bitvector64_t bv);
}