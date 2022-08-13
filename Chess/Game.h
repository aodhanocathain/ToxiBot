#pragma once

#include "Board.h"
#include "Movelist.h"
#include "Piece.h"
#include "Team.h"
#include "Move.h"

struct Game
{
	struct Board *board;	//the board the game is played on
	int moved;	//bit vector where index n is set if the piece with unique id n has moved during the game
	struct Movelist *moves;	//the moves that have been played so far
};

struct Game* Game_create_default();

static inline void Game_set_moved(struct Game* game, Piece_part unique_id)
{
	//set bit at index unique_id
	game->moved |= (1 << unique_id);
}
static inline void Game_set_unmoved(struct Game* game, Piece_part unique_id)
{
	//clear bit at index unique_id
	game->moved &= ~(1 << unique_id);
}
static inline int Game_get_moved(struct Game* game, Piece_part unique_id)
{
	return 1 & (game->moved >> unique_id);
}
static inline int Game_get_unmoved(struct Game* game, Piece_part unique_id)
{
	return !Game_get_moved(game, unique_id);
}

static inline Team Game_turn_get(struct Game* game)
{
	//return (game->moves)->usedSize % NUM_TEAMS;
	return (game->moves)->usedSize & 1;	//equivalent to the above for 2 teams
}

#define LEGALS 1
#define MOVES 0
struct Movelist* Game_get_available_moves(struct Game* game, int legals);

int Game_piece_alive(struct Game* game, Piece piece);

void Game_make_move(struct Game* game, Move move);
void Game_make_random_move(struct Game* game);
void Game_undo_move(struct Game* game);

void Game_print(struct Game* game);

int Game_check(struct Game* game);
#define CHECKMATE 1
#define STALEMATE 2
int Game_mate(struct Game* game);