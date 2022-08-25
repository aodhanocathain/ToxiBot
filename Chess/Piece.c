#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "Piece.h"
#include "Place.h"
#include "Colours.h"
#include "Team.h"
#include "Mask.h"

#define PIECE_TEAM_INDEX (PIECE_ID_BITS + PIECE_TYPE_BITS)

const Place_Spec KING_INCS[FIXED_PATTERN_SIZE][PLACE_SPECS] = { {-1,0},{0,1},{1,0},{1,0},{0,-1},{0,-1},{-1,0},{-1,0} };
const Place_Spec KNIGHT_INCS[FIXED_PATTERN_SIZE][PLACE_SPECS] = { {-2,1},{1,1},{2,0},{1,-1},{0,-2},{-1,-1},{-2,0},{-1,1} };
const unsigned int PIECE_VALUES[NUM_PIECE_TYPES] = {0, 9, 5, 3, 3, 1};

const char PIECE_TYPE_CHARACTERS[NUM_PIECE_TYPES] = { 'K','Q','R','B','N','P' };

Piece Piecify(Piece_part team, Piece_part id, Piece_part type)
{
	return (team << (PIECE_TEAM_INDEX)) | (id << PIECE_TYPE_BITS) | type;
}
Team Piece_team(Piece piece)
{
	return (piece >> PIECE_TEAM_INDEX) & Mask(PIECE_TEAM_BITS);
}
Piece_part Piece_id(Piece piece)
{
	return (piece >> PIECE_TYPE_BITS) & Mask(PIECE_ID_BITS);
}
Piece_part Piece_type(Piece piece)
{
	return piece & Mask(PIECE_TYPE_BITS);
}
Piece_part Piece_unique_id(Piece piece)
{
	return (piece >> PIECE_TYPE_BITS) & Mask(PIECE_TEAM_BITS + PIECE_ID_BITS);
}

char* Piece_format(Piece piece)
{
	char* format = malloc(sizeof(char) * (strlen(PIECE_STRING_SHAPE) + 1));
	char* col = (Piece_type(piece) >= NUM_PIECE_TYPES) ? colourf(RESET_TEXT):
				(Piece_team(piece) == WHITE_TEAM) ? colourf(WHITE_TEAM_TEXT) : colourf(BLACK_TEAM_TEXT);
	sprintf(format, "%s%c", col, (Piece_type(piece) >= NUM_PIECE_TYPES? '_' : PIECE_TYPE_CHARACTERS[Piece_type(piece)]));
	free(col);
	return format;
}