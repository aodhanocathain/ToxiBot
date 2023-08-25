#include "Move.h"
#include "Square.h"

Move Move_make(Square mainBefore, Square mainAfter)
{
	return (mainBefore * MAX_SQUARE) + mainAfter;
}

Square Move_mainBefore(Move move)
{
	return move/MAX_SQUARE;
}

Square Move_mainAfter(Move move)
{
	return move%MAX_SQUARE;
}

void Move_print(Move move)
{
	Square_print(Move_mainBefore(move));
	printf("->");
	Square_print(Move_mainAfter(move));
}