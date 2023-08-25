#include "Game.h"

#include <stdio.h>

int main()
{
	Game* game = Game_create(NULL);
	char* string = Game_toString(game);
	printf("%s\n", string);
	return 0;
}