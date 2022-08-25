#pragma once

#include "Piece.h"
#include "Place.h"
#include "Colours.h"

typedef long int Move;

Move Movify(int firstmove, Piece target, Place from, Place to);
int Move_firstmove(Move move);
Piece Move_target(Move move);
Place Move_from(Move move);
Place Move_to(Move move);

#define MOVE_STRING_SHAPE "f_" PIECE_STRING_SHAPE COLOUR_RESET_STRING_SHAPE "frfr"
char* Move_format(Move move);