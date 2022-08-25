#pragma once

#include "Move.h"
#include "Place.h"

struct Movelist
{
	int maxSize;
	int usedSize;
	Move* moves;
};

struct Movelist* Movelist_create(int maxSize);

void Movelist_add(struct Movelist* movelist, Move move);
Move Movelist_remove(struct Movelist* movelist);

int Movelist_contains(struct Movelist* movelist, Move move);
int Movelist_find_to(struct Movelist* movelist, Place place);

char* Movelist_format(struct Movelist* movelist);

void Movelist_free(struct Movelist* movelist);