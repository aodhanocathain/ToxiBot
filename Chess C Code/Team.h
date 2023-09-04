#pragma once

struct Team;
typedef struct Team Team;
enum TEAM_TYPE {WHITE_TEAM_TYPE, BLACK_TEAM_TYPE};

#include "Piece.h"
#include "Constants.h"

struct Team {
	enum TEAM_TYPE type;
	
	Piece* activePieces[NUM_SQUARES];
	Piece* inactivePieces[NUM_SQUARES];
	unsigned char nextId;
};

extern const char TEAM_TYPE_CHARS[];
extern const char (*TEAM_TYPE_CHAR_CONVERTERS[])(char unteamedChar);

enum TEAM_TYPE Team_type_of_teamedChar(char teamedChar);

Team* Team_create(enum TEAM_TYPE type);

void Team_addActivePiece(Team* team, Piece* piece);
void Team_registerPiece(Team* team, Piece* piece);
void Team_activatePiece(Team* team, Piece* piece);