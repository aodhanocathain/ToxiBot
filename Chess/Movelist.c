#include <stdlib.h>
#include <stdio.h>
#include <string.h>

#include "Movelist.h"
#include "Move.h"
#include "Place.h"

void Movelist_grow(struct Movelist* movelist)
{
	#define MOVELIST_GROWTH_RATE 2	//just because
	movelist->maxSize *= MOVELIST_GROWTH_RATE;
	#undef MOVELIST_GROWTH_RATE

	//allocate a new, bigger list
	Move* biggerlist = malloc(sizeof(Move) * movelist->maxSize);
	//copy data from old list to new list
	for (int i = 0; i < movelist->usedSize; i++)
	{
		biggerlist[i] = movelist->moves[i];
	}
	//free old list
	free(movelist->moves);

	movelist->moves = biggerlist;
}

struct Movelist* Movelist_create(int maxSize)
{
	struct Movelist* movelist = malloc(sizeof(struct Movelist));
	movelist->maxSize = maxSize;
	movelist->usedSize = 0;
	movelist->moves = malloc(sizeof(Move) * maxSize);
	return movelist;
}

void Movelist_add(struct Movelist* movelist, Move move)
{
	if ((movelist->usedSize) < (movelist->maxSize))	//if there is space
	{
		movelist->moves[movelist->usedSize] = move;
		movelist->usedSize++;
	}
	else
	{
		Movelist_grow(movelist);
		Movelist_add(movelist, move);
	}
}
Move Movelist_remove(struct Movelist* movelist)
{
	Move move = movelist->moves[movelist->usedSize - 1];
	movelist->usedSize--;
	return move;
}

int Movelist_contains(struct Movelist* movelist, Move move)
{
	for (int i = 0; i < movelist->usedSize; i++)
	{
		if (movelist->moves[i] == move)
		{
			return 1;
		}
	}
	return 0;
}
int Movelist_find_to(struct Movelist* movelist, Place to)	//find a move that targets a particular square
{
	for (int i = 0; i < movelist->usedSize; i++)
	{
		if (Move_to(movelist->moves[i]) == to)
		{
			return 1;
		}
	}
	return 0;
}

char* Movelist_format(struct Movelist* movelist)
{
	char* format = malloc
	(
		sizeof(char)*
		(
			//num moves * (length per move + 1 space after a move)
			(movelist->usedSize * (strlen(MOVE_STRING_SHAPE) + 1)) + 1	// +1 again for the null terminator
		)
	);
	format[0] = 0;
	
	char* movestr;
	for (int i = 0; i < movelist->usedSize; i++)
	{
		//concatenate the existing format with the next move, and a space
		movestr = Move_format(movelist->moves[i]);
		sprintf(format, "%s%s ", format, movestr);
		free(movestr);
	}
	return format;
}

void Movelist_free(struct Movelist* movelist)
{
	free(movelist->moves);
	free(movelist);
}