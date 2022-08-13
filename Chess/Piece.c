#include <stdio.h>

#include "Piece.h"
#include "Place.h"
#include "Colours.h"
#include "Team.h"

const Spec KING_INCS[FIXED_PATTERN_SIZE][PLACE_SPECS] = { {-1,0},{0,1},{1,0},{1,0},{0,-1},{0,-1},{-1,0},{-1,0} };
const Spec KNIGHT_INCS[FIXED_PATTERN_SIZE][PLACE_SPECS] = { {-2,1},{1,1},{2,0},{1,-1},{0,-2},{-1,-1},{-2,0},{-1,1} };

#define NUM_PIECE_TYPES 6
const char PIECE_TYPE_CHARACTERS[NUM_PIECE_TYPES] = { 'K','Q','R','B','N','P' };

void Piece_print(Piece piece)
{
	if (Piece_type(piece) >= NUM_PIECE_TYPES) { colour(RESET_TEXT); printf("_"); colour(RESET_TEXT); }
	else
	{
		if (Piece_team(piece) == WHITE_TEAM) { colour(WHITE_TEAM_TEXT); }
		else { colour(BLACK_TEAM_TEXT); }
		printf("%c", PIECE_TYPE_CHARACTERS[Piece_type(piece)]);
		colour(RESET_TEXT);
	}
}

char Piece_charify_Discord(Piece piece)
{
	if(piece==NO_PIECE)
	{
		return 'a'+12;
	}
	else
	{
		return 'a'+(Piece_team(piece)*6 + Piece_type(piece));
	}
}
