#include "BitVector64.h"
using BitVector64::bitvector64_t;

bitvector64_t BitVector64::zeroes()
{
	return (bitvector64_t)0;
}

bitvector64_t BitVector64::set(bitvector64_t bv, int index)
{
	return bv | (((bitvector64_t)1)<<index);
}
bitvector64_t BitVector64::clear(bitvector64_t bv, int index)
{
	return bv & ~(((bitvector64_t)1) << index);
}

int BitVector64::read(bitvector64_t bv, int index)
{
	return (bv >> index) & 1;
}
bitvector64_t BitVector64::write(bitvector64_t bv, int index, int value)
{
	return BitVector64::clear(bv, index) | (((bitvector64_t)value) << index);
}

bitvector64_t BitVector64::invert(bitvector64_t bv)
{
	return ~bv;
}

bitvector64_t BitVector64::bitwiseAnd(bitvector64_t bv1, bitvector64_t bv2)
{
	return bv1 & bv2;
}
bitvector64_t BitVector64::bitwiseOr(bitvector64_t bv1, bitvector64_t bv2)
{
	return bv1 | bv2;
}

bool BitVector64::isEmpty(bitvector64_t bv)
{
	return bv == 0;
}