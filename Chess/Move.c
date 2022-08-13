#include <stdio.h>

#include "Move.h"
#include "Place.h"
#include "Piece.h"

void Move_print(Move move)
{
	printf("%d", Move_firstmove(move));
	Piece_print(Move_target(move));
	Place_print(Move_from(move));
	Place_print(Move_to(move));
}