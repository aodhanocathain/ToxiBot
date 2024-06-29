#include <intrin.h>

#include "BitVector64.h"
using BitVector64::bitvector64_t;
#include "Square.h"
using Square::square_t;
#include "SquareSet.h"
using SquareSet::squareset_t;

squareset_t SquareSet::emptySet()
{
	return BitVector64::zeroes();
}

squareset_t SquareSet::add(squareset_t set, square_t square)
{
	return BitVector64::set(set, square);
}
squareset_t SquareSet::remove(squareset_t set, square_t square)
{
	return BitVector64::clear(set, square);
}

bool SquareSet::has(squareset_t set, square_t square)
{
	return BitVector64::read(set, square) == 1;
}

squareset_t SquareSet::unify(squareset_t s1, squareset_t s2)
{
	return BitVector64::bitwiseOr(s1, s2);
}
squareset_t SquareSet::intersect(squareset_t s1, squareset_t s2)
{
	return BitVector64::bitwiseAnd(s1, s2);
}
squareset_t SquareSet::differ(squareset_t mainset, squareset_t removedset)
{
	return BitVector64::bitwiseAnd(mainset, BitVector64::invert(removedset));
}

square_t SquareSet::getLowestSquare(squareset_t set) {
	unsigned long int lsb;
	_BitScanForward64(&lsb, set);
	return lsb;
}