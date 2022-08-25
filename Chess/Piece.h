#pragma once

#include "Place.h"
#include "Team.h"
#include "Colours.h"

#define NO_PIECE ((Piece)(-1))

#define PIECE_TYPE_BITS 3	//log2(NUM_PIECE_TYPES)
#define PIECE_ID_BITS 4	//log2(TEAM_SIZE)
#define PIECE_TEAM_BITS 1	//log2(NUM_TEAMS)

#define PIECE_BITS (PIECE_TEAM_BITS + PIECE_ID_BITS + PIECE_TYPE_BITS)

#define FIXED_PATTERN_SIZE 8
#define NUM_PIECE_TYPES 6

typedef unsigned char Piece;
typedef unsigned char Piece_part;	//part(s) of a Piece, like its unique id

extern const Place_Spec KING_INCS[FIXED_PATTERN_SIZE][PLACE_SPECS];
extern const Place_Spec KNIGHT_INCS[FIXED_PATTERN_SIZE][PLACE_SPECS];
extern const unsigned int PIECE_VALUES[NUM_PIECE_TYPES];

typedef enum { KING, QUEEN, ROOK, BISHOP, KNIGHT, PAWN } Type;

Piece Piecify(Piece_part team, Piece_part id, Piece_part type);
Team Piece_team(Piece piece);
Piece_part Piece_id(Piece piece);
Piece_part Piece_type(Piece piece);
Piece_part Piece_unique_id(Piece piece);

#define PIECE_STRING_SHAPE COLOUR_APPLY_STRING_SHAPE "p"
char* Piece_format(Piece piece);
