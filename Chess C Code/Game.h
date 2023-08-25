#pragma once

#include "Piece.h"
#include "constants.h"

typedef struct {
	Piece* pieces[NUM_SQUARES];
} Game;

extern char* GAME_DEFAULT_FEN_STRING;

Game* Game_create(char* FENString);
char* Game_toString(Game* game);