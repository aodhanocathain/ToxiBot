#include "Move.h"
#include "Square.h"

#include <stdlib.h>

const Move DUMMY_MOVE = {DUMMY_SQUARE, DUMMY_SQUARE};

Move* Move_create(Square mainBefore, Square mainAfter)
{
	Move* move = (Move*)malloc(sizeof(Move));
	move->mainBefore = mainBefore;
	move->mainAfter = mainAfter;
	
	return move;
}

Square Move_mainBefore(Move* move)
{
	return move->mainBefore;
}

Square Move_mainAfter(Move* move)
{
	return move->mainAfter;
}

int Move_compare(Move* m1, Move* m2)
{
	return Square_equal(m1->mainBefore, m2->mainBefore) && Square_equal(m1->mainAfter, m2->mainAfter);
}

void Move_print(Move* move)
{
	Square_print(Move_mainBefore(move));
	printf("->");
	Square_print(Move_mainAfter(move));
}