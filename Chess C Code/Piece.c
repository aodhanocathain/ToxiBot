#include "Piece.h"

#include <stdlib.h>

enum PIECE_TYPE {KING};
const char PIECE_TYPE_CHARS[] = {'K'};
const int PIECE_TYPE_POINTS[] = {0};

Piece* Piece_create(enum PIECE_TYPE type, unsigned char id)
{
	Piece* piece = (Piece*)malloc(sizeof(Piece));
	piece->type = type;
	piece->id = id;
	return piece;
}