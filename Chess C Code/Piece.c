#include "Piece.h"

#include <stdlib.h>

const char PIECE_TYPE_CHARS[] = {'K'};

Piece* Piece_create(enum PIECE_TYPE type, unsigned char id)
{
	Piece* piece = (Piece*)malloc(sizeof(Piece));
	piece->type = type;
	piece->id = id;
	return piece;
}