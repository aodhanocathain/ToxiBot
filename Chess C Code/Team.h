#pragma once

#include "Piece.h"
#include "Constants.h"

extern enum TEAM_TYPE;
extern const char TEAM_TYPE_CHARS[];
extern const (*TEAM_TYPE_CHAR_CONVERTERS[])(char unteamedChar);

struct Team;
typedef struct Team Team;

typedef struct {
	enum TEAM_TYPE type;
	
	Piece activePieces[NUM_SQUARES];
	Piece inactivePieces[NUM_SQUARES];
	unsigned char nextId;
} Team;

enum TEAM_TYPE Team_teamedChar_to_type(char teamedChar);

Team* Team_create(TEAM_TYPE type);

void Team_addActivePiece(Team* team, Piece* piece);
void Team_registerPiece(Team* team, Piece* piece);
void Team_activatePiece(Team* team, Piece* piece);