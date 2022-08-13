#include <time.h>
#include <stdlib.h>
#include <stdio.h>

#include "Game.h"
#include "Piece.h"
#include "Board.h"
#include "Place.h"
#include "Movelist.h"
#include "Team.h"
#include "Move.h"

int Game_piece_alive(struct Game* game, Piece piece)
{
	if (piece == NO_PIECE) { return 0; }

	struct Board* board = game->board;
	//if the piece is not where it was last seen, then it must have been captured
	Place place = Board_place_get(board, Piece_unique_id(piece));
	return (Board_square_get(board, place) == piece);
}
int Game_immediate_loss(struct Game* game)
{
	//check if the moving team can "capture" the other's king
	struct Movelist* movelist = Game_get_available_moves(game, MOVES);
	struct Board* board = game->board;
	//Piece threatenedKing = Board_piece_get(board, (Game_turn_get(game) - 1) % NUM_TEAMS);	more generally
	Piece threatenedKing = Board_piece_get(board, Game_turn_get(game) == WHITE_TEAM ? TEAM_SIZE: 0);	//works for 2 teams
	int result = Movelist_find_to(movelist, Board_place_get(board, Piece_unique_id(threatenedKing)));
	Movelist_free(movelist);
	return result;
}

struct Game* Game_create_default()
{
	struct Game* game = malloc(sizeof(struct Game));
	game->board = Board_create_default();
	game->moved = 0;
	game->moves = Movelist_create(20);
	return game;
}

void Game_add_fixed_pattern(struct Game* game, Piece piece, struct Movelist* movelist, char legals)
{
	struct Board* board = game->board;
	Place from = Board_place_get(board, Piece_unique_id(piece));
	Spec file = Place_file(from);
	Spec rank = Place_rank(from);

	const Spec* incs = (const char*)(Piece_type(piece) == KING ? KING_INCS : KNIGHT_INCS);
	//start at the current square and go round the board visiting each square
	for (int i = 0; i < (FIXED_PATTERN_SIZE * PLACE_SPECS); i += PLACE_SPECS)
	{
		file += incs[i]; rank += incs[i + 1];

		if (Board_contains_place(file, rank))
		{
			Place to = Placify_int(file, rank);

			Piece mover = Board_square_get(board, from);
			Piece target = Board_square_get(board, to);

			Move move = Movify(Game_get_unmoved(game, Piece_unique_id(mover)), target, from, to);

			if (target != NO_PIECE && (Piece_team(target) == Piece_team(mover)))
			{
				//move tries to capture a piece of the same team?
				//do not consider it, move on
				continue;
			}

			if (legals)
			{
				//see if making the move leaves the king vulnerable to capture
				Game_make_move(game, move);
				if (!Game_immediate_loss(game))
				{
					//it does not leave king vulnerable to capture, therefore it is legal
					Movelist_add(movelist, move);
				}
				Game_undo_move(game);
			}
			else	//this considers all valid squares in the pattern regardless of legality
			{
				Movelist_add(movelist, move);
			}
		}
	}
}
struct Movelist* Game_get_available_moves(struct Game* game, int legals)
{
	struct Movelist* movelist = Movelist_create(100);
	int firstID = TEAM_SIZE * Game_turn_get(game);
	//piece by piece, collect the whole team's available moves
	for (int i = firstID; i < firstID + TEAM_SIZE; i++)
	{
		Piece piece = Board_piece_get(game->board, i);
		if (Game_piece_alive(game, piece))
		{
			Game_add_fixed_pattern(game, piece, movelist, legals);
		}
	}
	return movelist;
}

void Game_make_move(struct Game* game, Move move)
{
	struct Board* board = game->board;
	Place from = Move_from(move);
	Place to = Move_to(move);
	Piece mover = Board_square_get(board, from);
	Piece_part mover_unique_id = Piece_unique_id(mover);

	//empty the 'from square' and fill the 'to' square
	Board_square_set(board, to, mover);
	Board_square_set(board, from, NO_PIECE);

	//the piece at the 'from' square needs to know its new place is the 'to' square
	Board_place_set(board, mover_unique_id, to);

	//keep a record of the game's moves
	Movelist_add(game->moves, move);
	Game_set_moved(game, mover_unique_id);
}
void Game_make_random_move(struct Game* game)
{
	srand((unsigned int)time(0));
	struct Movelist* movelist = Game_get_available_moves(game, LEGALS);
	int i = rand() % movelist->usedSize;
	Game_make_move(game, movelist->moves[i]);
	Movelist_free(movelist);
}
void Game_undo_move(struct Game* game)
{
	//remove the move from the game's history
	struct Board* board = game->board;
	Move move = Movelist_remove(game->moves);
	Place from = Move_from(move);
	Place to = Move_to(move);
	Piece mover = Board_square_get(board, to);
	Piece target = Move_target(move);
	Piece_part mover_unique_id = Piece_unique_id(mover);

	//return the mover to the square it came from
	Board_square_set(board, from, mover);

	//return the target to the square it was captured on
	Board_square_set(board, to, target);

	//the mover has to know it was moved back
	Board_place_set(board, mover_unique_id, from);

	//undo the first move consequences, if any
	if (Move_firstmove(move))
	{
		Game_set_unmoved(game, mover_unique_id);
	}
}

void Game_print(struct Game* game)
{
	Board_print(game->board);
	printf("\n");
	Movelist_print(game->moves);
	printf("\n");
	printf("Turn: %s\t", Game_turn_get(game)==WHITE_TEAM? "White" : "Black");
	printf("Moved vector: %x\n", game->moved);
}

int Game_check(struct Game* game)
{
	struct Board* board = game->board;
	Piece threatenedKing = Board_piece_get(board, Game_turn_get(game)==WHITE_TEAM? 0 : TEAM_SIZE);	//works for 2 teams

	game->moves->usedSize++;	//temporarily change the turn to see if the opposition could capture the king
	struct Movelist* moves = Game_get_available_moves(game, MOVES);
	int result = Movelist_find_to(moves, Board_place_get(board, Piece_unique_id(threatenedKing)));
	Movelist_free(moves);

	game->moves->usedSize--;	//revert the turn back to how it was

	return result;
}
int Game_mate(struct Game* game)
{
	struct Movelist* moves = Game_get_available_moves(game, LEGALS);
	int size = moves->usedSize;
	Movelist_free(moves);
	int check = Game_check(game);
	if (size == 0)
	{
		if (check) { return CHECKMATE; }
		else { return STALEMATE; }
	}
	else
	{
		return 0;
	}
}
