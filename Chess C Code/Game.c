#include "Game.h"
#include "Piece.h"

#include <stdlib.h>

char* GAME_DEFAULT_FEN_STRING = "k7/8/8/8/8/8/8/K7";

Game* Game_create(char* FENString)
{
	Game* game = (Game*)malloc(sizeof(Game));
	return game;
}

char* Game_toString(Game* game)
{
	return "test";
}