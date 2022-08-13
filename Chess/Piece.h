#pragma once

#include "Place.h"

typedef unsigned char Piece;
typedef unsigned char Piece_part;	//part(s) of a Piece, like its unique id

#define MASK(leng)((1<<(leng))-1)

#define PIECE_TEAM_BITS 1	//log2(NUM_TEAMS)
#define PIECE_TYPE_BITS 3	//log2(NUM_PIECE_TYPES)
#define PIECE_ID_BITS 4	//log2(TEAM_SIZE)
#define PIECE_BITS (PIECE_TEAM_BITS + PIECE_ID_BITS + PIECE_TYPE_BITS)

#define PIECE_TEAM_INDEX (PIECE_ID_BITS + PIECE_TYPE_BITS)

#define NO_PIECE ((Piece)(-1))

#define FIXED_PATTERN_SIZE 8
extern const Spec KING_INCS[FIXED_PATTERN_SIZE][PLACE_SPECS];
extern const Spec KNIGHT_INCS[FIXED_PATTERN_SIZE][PLACE_SPECS];

typedef enum { KING, QUEEN, ROOK, BISHOP, KNIGHT, PAWN } Type;

static inline Piece Piecify(Piece_part team, Piece_part id, Piece_part type)
{
	return (team << (PIECE_TEAM_INDEX)) | (id << PIECE_TYPE_BITS) | type;
}
static inline Piece_part Piece_team(Piece piece)
{
	return (piece >> PIECE_TEAM_INDEX) & MASK(PIECE_TEAM_BITS);
}
static inline Piece_part Piece_id(Piece piece)
{
	return (piece >> PIECE_TYPE_BITS) & MASK(PIECE_ID_BITS);
}
static inline Piece_part Piece_type(Piece piece)
{
	return piece & MASK(PIECE_TYPE_BITS);
}
static inline Piece_part Piece_unique_id(Piece piece)
{
	return (piece >> PIECE_TYPE_BITS) & MASK(PIECE_TEAM_BITS + PIECE_ID_BITS);
}

void Piece_print(Piece piece);
char Piece_charify_Discord(Piece piece);
