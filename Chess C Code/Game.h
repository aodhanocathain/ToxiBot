#pragma once

struct Game;
typedef struct Game Game;

#include "Team.h"
#include "constants.h"
#include "Piece.h"
#include "Move.h"

struct Game {
	Team* teams[NUM_TEAM_TYPES];
	Team* movingTeam;
	
	Piece* pieces[NUM_SQUARES];
};

extern char* GAME_DEFAULT_FEN_STRING;

Game* Game_create(char* FENString);
char* Game_toString(Game* game);

Move* Game_moves(Game* game);