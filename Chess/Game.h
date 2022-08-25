#pragma once

#include "Board.h"
#include "Movelist.h"
#include "Piece.h"
#include "Move.h"
#include "Place.h"

#define CHECKMATE 1
#define STALEMATE 2

#define MOVES 0
#define LEGALS 1

#define MAX_SCORE 104	//the greatest "point" advantage a team could have by piece values

#define EVAL_DEPTH 4

struct Game
{
	struct Board *board;	//the board the game is played on
	int moved;	//bit vector where index n is set if the piece with unique id n has moved during the game
	struct Movelist *moves;	//the moves that have been played so far
};

struct Game* Game_create_default();

void Game_set_moved(struct Game* game, Piece_part unique_id);
void Game_set_unmoved(struct Game* game, Piece_part unique_id);
int Game_get_moved(struct Game* game, Piece_part unique_id);
int Game_get_unmoved(struct Game* game, Piece_part unique_id);

Team Game_turn_get(struct Game* game);

struct Movelist* Game_get_available_moves(struct Game* game, int legals);

void Game_make_move(struct Game* game, Move move);
void Game_make_random_move(struct Game* game);
void Game_make_best_move(struct Game* game, int updates);
void Game_undo_move(struct Game* game);

int Game_piece_alive(struct Game* game, Piece piece);
int Game_check(struct Game* game);
int Game_mate(struct Game* game);

double Game_piece_value(struct Game* game, Piece piece);

double Game_evaluate(struct Game* game, int depth);
Move Game_best_move(struct Game* game, int searchDepth, int updates);

Move Game_movify(struct Game* game, Place from, Place to);

char* Game_format(struct Game* game);
