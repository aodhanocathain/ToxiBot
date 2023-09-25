#pragma once

#include "Square.h"

typedef struct {
	Square mainBefore;
	Square mainAfter;
} Move;

extern const Move DUMMY_MOVE;

Move* Move_create(Square mainBefore, Square mainAfter);

Square Move_mainBefore(Move* move);
Square Move_mainAfter(Move* move);

int Move_compare(Move* m1, Move* m2);

void Move_print(Move* move);