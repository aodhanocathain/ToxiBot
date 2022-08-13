#pragma once

#include <stdio.h>

#include "Piece.h"
#include "Place.h"

typedef long int Move;

#define MOVE_FIRSTMOVE_BITS 1

#define MOVE_TARGET_INDEX (PLACE_BITS + PLACE_BITS)
#define MOVE_FIRSTMOVE_INDEX (MOVE_TARGET_INDEX + PIECE_BITS)

static inline Move Movify(int firstmove, Piece target, Place from, Place to)
{
	return (firstmove << MOVE_FIRSTMOVE_INDEX) | (target << MOVE_TARGET_INDEX) | (from << PLACE_BITS) | to;
}
static inline int Move_firstmove(Move move)
{
	return (move >> MOVE_FIRSTMOVE_INDEX) & 1;
}
#define MOVE_PIECE_MASK ((1<<PIECE_BITS)-1)
static inline Piece Move_target(Move move)
{
	return (move >> MOVE_TARGET_INDEX) & MOVE_PIECE_MASK;
}
static inline Place Move_from(Move move)
{
	return (move >> PLACE_BITS) & PLACE_MASK;
}
static inline Place Move_to(Move move)
{
	return move & PLACE_MASK;
}

void Move_print(Move move);