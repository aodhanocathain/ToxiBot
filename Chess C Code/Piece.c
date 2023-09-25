#include "Piece.h"
#include "Move.h"
#include "Team.h"
#include "helpers.h"

#include <stdlib.h>

const char PIECE_TYPE_CHARS[] = {'K'};

Piece* Piece_create(enum TEAM_TYPE teamType, enum PIECE_TYPE pieceType, unsigned char id)
{
	Piece* piece = (Piece*)malloc(sizeof(Piece));
	piece->teamType = teamType;
	piece->pieceType = pieceType;
	piece->id = id;
	return piece;
}

enum PIECE_TYPE Piece_type_of_teamedChar(char teamedChar)
{
	for(int type=KING_PIECE_TYPE; type<NUM_PIECE_TYPES; type++)
	{
		if(toUpperCase(teamedChar)==PIECE_TYPE_CHARS[type])
		{
			return type;
		}
	}
	return -1;
}

void Piece_addMoves(Piece* piece, Move* moves)
{
}