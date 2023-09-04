#pragma once

struct Game;
typedef struct Game Game;

#include "Piece.h"
#include "constants.h"

struct Game {
	Team* white;
	Team* black;
	Team* teams[NUM_TEAM_TYPES];
	Piece* pieces[NUM_SQUARES];
};

extern char* GAME_DEFAULT_FEN_STRING;

Game* Game_create(char* FENString);
char* Game_toString(Game* game);