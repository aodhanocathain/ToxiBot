#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "Move.h"
#include "Place.h"
#include "Piece.h"
#include "Mask.h"
#include "Colours.h"

#define TARGET_INDEX (PLACE_BITS + PLACE_BITS)
#define FIRSTMOVE_INDEX (PIECE_BITS + TARGET_INDEX)
#define FIRSTMOVE_BITS 1

Move Movify(int firstmove, Piece target, Place from, Place to)
{
	return (firstmove << FIRSTMOVE_INDEX) | (target << TARGET_INDEX) | (from << PLACE_BITS) | to;
}
int Move_firstmove(Move move)
{
	return (move >> FIRSTMOVE_INDEX) & Mask(FIRSTMOVE_BITS);;
}
Piece Move_target(Move move)
{
	return (move >> TARGET_INDEX) & Mask(PIECE_BITS);
}
Place Move_from(Move move)
{
	return (move >> PLACE_BITS) & Mask(PLACE_BITS);
}
Place Move_to(Move move)
{
	return move & Mask(PLACE_BITS);
}

char* Move_format(Move move)
{
	char* format = malloc(sizeof(char) * (strlen(MOVE_STRING_SHAPE) + 1));	//+1 for the null terminator
	sprintf(format, "%d", Move_firstmove(move));
	char* helper = Piece_format(Move_target(move));
	sprintf(format, "%s_%s", format, helper);
	free(helper);
	helper = resetf();
	sprintf(format, "%s%s", format, helper);
	free(helper);
	helper = Place_format(Move_from(move));
	sprintf(format, "%s%s", format, helper);
	free(helper);
	helper = Place_format(Move_to(move));
	sprintf(format, "%s%s", format, helper);
	free(helper);
	return format;
}