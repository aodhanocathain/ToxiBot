#pragma once

#include "BitVector64.h"
#include "Square.h"

namespace SquareSet {
	typedef BitVector64::bitvector64_t squareset_t;

	squareset_t emptySet();

	squareset_t add(squareset_t set, Square::square_t square);
	squareset_t remove(squareset_t set, Square::square_t square);

	bool has(squareset_t set, Square::square_t square);

	squareset_t unify(squareset_t s1, squareset_t s2);
	squareset_t intersect(squareset_t s1, squareset_t s2);
	squareset_t differ(squareset_t s1, squareset_t s2);
}
