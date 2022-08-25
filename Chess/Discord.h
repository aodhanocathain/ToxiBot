#pragma once

#include "Piece.h"
#include "Board.h"
#include "Move.h"
#include "Movelist.h"

#define UPDATES 1
#define NO_UPDATES 0

typedef enum {ADVICE_D, ERROR_D, GAME_D, RESULT_D, UPDATE_D, NUM_OUTTYPES} outtype;
typedef enum {ADVISE_D, BEST_D, EVAL_D, MAKE_D, RANDOM_D, SIMULATE_D, UNDO_D, NUM_INTYPES} intype;	//match the strings in Discord.c

extern char* OUT_HEADERS[NUM_OUTTYPES];
extern char* IN_HEADERS[NUM_INTYPES];

void Discord_out(outtype o, const char* message);
int Discord_Move_validate(const char* fromto);

char* Discord_Piece_format(Piece piece);
char* Discord_Move_format(Move move);
char* Discord_Movelist_format(struct Movelist* movelist);
char* Discord_Board_format(struct Board* board);