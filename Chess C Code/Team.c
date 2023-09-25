#include "Team.h"
#include "helpers.h"
#include "Constants.h"
#include "Piece.h"

#include <stdlib.h>

const char TEAM_TYPE_CHARS[] = {'w','b'};
const char (*TEAM_TYPE_CHAR_CONVERTERS[])(char unteamedChar) = {toUpperCase, toLowerCase};

enum TEAM_TYPE Team_type_of_teamedChar(char unteamedChar)
{
	if(TEAM_TYPE_CHAR_CONVERTERS[WHITE_TEAM_TYPE](unteamedChar) == unteamedChar)
	{
		return WHITE_TEAM_TYPE;
	}
	else
	{
		return BLACK_TEAM_TYPE;
	}
}

Team* Team_create(enum TEAM_TYPE type)
{	
	Team* team = (Team*)malloc(sizeof(Team));
	
	team->type = type;
	
	for(int i=0; i<NUM_SQUARES; i++)
	{
		team->activePieces[i] = NULL;
		team->inactivePieces[i] = NULL;
	}
	team->numPieces = 0;
	return team;
}

void Team_activatePiece(Team* team, Piece* piece)
{
	team->activePieces[piece->id] = piece;
	team->inactivePieces[piece->id] = NULL;
}