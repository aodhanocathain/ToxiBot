#include "Game.h"

#include <stdio.h>

int main()
{
	Game* game = Game_create(GAME_DEFAULT_FEN_STRING);
	char* gameString = Game_toString(game);
	printf("%s\n", gameString);
	return 0;
}