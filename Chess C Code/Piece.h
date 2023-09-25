#pragma once

#include "Move.h"

struct Piece;
typedef struct Piece Piece;
enum PIECE_TYPE {KING_PIECE_TYPE, NUM_PIECE_TYPES};

#include "Team.h"

struct Piece {
	enum TEAM_TYPE teamType;
	enum PIECE_TYPE pieceType;
	unsigned char id;
};

extern const char PIECE_TYPE_CHARS[];

Piece* Piece_create(enum TEAM_TYPE teamType, enum PIECE_TYPE pieceType, unsigned char id);

enum PIECE_TYPE Piece_type_of_teamedChar(char teamedChar);

void Piece_addMoves(Piece* piece, Move* moves);