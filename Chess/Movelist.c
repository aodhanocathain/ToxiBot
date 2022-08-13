#include <stdlib.h>
#include <stdio.h>

#include "Movelist.h"
#include "Move.h"
#include "Place.h"

#define MOVELIST_GROWTH_RATE 2
void Movelist_grow(struct Movelist* movelist)
{
	movelist->maxSize *= MOVELIST_GROWTH_RATE;

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
//find a move that targets a particular square
int Movelist_find_to(struct Movelist* movelist, Place to)
{
	for (int i = 0; i < movelist->usedSize; i++)
	{
		if (Move_to(movelist->moves[i]) == to)
		{
			return 1;
		}
		else
		{
			//printf("Movelist_find_to | ");	Move_print(movelist->moves[i]);
			//printf(" does not attack ");	Place_print(to);	printf("\n");
			//printf(" because the move is %x, Move_to(that) is %x, to is %x\n", movelist->moves[i], Move_to(movelist->moves[i]), to);
		}
	}
	return 0;
}

#define MOVES_PER_LINE 8
void Movelist_print(struct Movelist* movelist)
{
	printf("Beginning Movelist_print:\n");
	for (int i = 0; i < movelist->usedSize; i++)
	{
		Move_print(movelist->moves[i]);
		printf("%c", ((i % MOVES_PER_LINE) == MOVES_PER_LINE-1 ? '\n' : '\t'));
	}
	printf("End of movelist.");
}

void Movelist_free(struct Movelist* movelist)
{
	free(movelist->moves);
	free(movelist);
}