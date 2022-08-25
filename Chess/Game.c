#include <time.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <limits.h>
#include <math.h>
#include <float.h>

#include "Game.h"
#include "Piece.h"
#include "Board.h"
#include "Place.h"
#include "Movelist.h"
#include "Team.h"
#include "Move.h"
#include "Colours.h"
#include "Discord.h"

#define DEFAULT_MOVELIST_SIZE 20

struct Game* Game_create_default()
{
#define ALL_UNMOVED 0
	struct Game* game = malloc(sizeof(struct Game));
	game->board = Board_create_default();
	game->moved = ALL_UNMOVED;
	game->moves = Movelist_create(DEFAULT_MOVELIST_SIZE);
	return game;
#undef ALL_UNMOVED
}

void Game_set_moved(struct Game* game, Piece_part unique_id)
{
	//set bit at index unique_id
	game->moved |= (1 << unique_id);
}
void Game_set_unmoved(struct Game* game, Piece_part unique_id)
{
	//clear bit at index unique_id
	game->moved &= ~(1 << unique_id);
}
int Game_get_moved(struct Game* game, Piece_part unique_id)
{
	return 1 & (game->moved >> unique_id);
}
int Game_get_unmoved(struct Game* game, Piece_part unique_id)
{
	return !Game_get_moved(game, unique_id);
}

Team Game_turn_get(struct Game* game)
{
	return (game->moves)->usedSize % NUM_TEAMS;
}
int Game_immediate_loss(struct Game* game)
{
	//check if the moving team can "capture" the waiting team's king
	struct Movelist* movelist = Game_get_available_moves(game, MOVES);
	struct Board* board = game->board;
	Piece threatenedKing = Board_piece_get(board, Game_turn_get(game)==WHITE_TEAM? TEAM_SIZE : 0);
	int result = Movelist_find_to(movelist, Board_place_get(board, Piece_unique_id(threatenedKing)));
	Movelist_free(movelist);
	return result;
}

void Game_add_fixed_pattern(struct Game* game, Piece piece, struct Movelist* movelist, int legals)
{
	struct Board* board = game->board;
	Place from = Board_place_get(board, Piece_unique_id(piece));
	Place_Spec file = Place_file(from);
	Place_Spec rank = Place_rank(from);

	const Place_Spec* incs = (const Place_Spec*)(Piece_type(piece) == KING ? KING_INCS : KNIGHT_INCS);
	//start at the current square and go round the board visiting each square
	for (int i = 0; i < (FIXED_PATTERN_SIZE * PLACE_SPECS); i += PLACE_SPECS)
	{
		file += incs[i]; rank += incs[i + 1];

		if (Board_contains_place(file, rank))
		{
			Place to = Placify_int(file, rank);
			Move move = Game_movify(game, from, to);

			Piece mover = Board_square_get(board, from);
			Piece target = Board_square_get(board, to);

			if (target != NO_PIECE && (Piece_team(target) == Piece_team(mover)))
			{
				//move tries to capture a piece of the same team - illegal
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
			else	//(if legals == MOVES) this considers all valid squares in the pattern regardless of legality
			{
				Movelist_add(movelist, move);
			}
		}
	}
}
struct Movelist* Game_get_available_moves(struct Game* game, int legals)
{
	struct Movelist* movelist = Movelist_create(DEFAULT_MOVELIST_SIZE);
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
	Board_square_set(board, from, NO_PIECE);
	Board_square_set(board, to, mover);

	//the piece that moved needs to know its new place is the 'to' square
	Board_place_set(board, mover_unique_id, to);

	//keep a record of the game's moves
	Movelist_add(game->moves, move);
	
	//record that any future moves by this piece are not its first
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
void Game_make_best_move(struct Game* game, int updates)
{
	Move move = Game_best_move(game, EVAL_DEPTH, updates);
	Game_make_move(game, move);
}
void Game_undo_move(struct Game* game)
{
	struct Board* board = game->board;
	
	//remove the move from the game's history
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

	//restore first move status, if previously existing
	if (Move_firstmove(move))
	{
		Game_set_unmoved(game, mover_unique_id);
	}
}

int Game_check(struct Game* game)
{
	struct Board* board = game->board;
	Piece threatenedKing = Board_piece_get(board, Game_turn_get(game)==WHITE_TEAM? KING : KING+TEAM_SIZE);	//works for 2 teams

	game->moves->usedSize++;	//temporarily change the turn to see if the opposition could capture the king
	struct Movelist* moves = Game_get_available_moves(game, MOVES);
	int result = Movelist_find_to(moves, Board_place_get(board, Piece_unique_id(threatenedKing)));
	Movelist_free(moves);

	game->moves->usedSize--;	//revert the turn back to how it was

	return result;
}
int Game_mate(struct Game* game)
{
	//acquire the number of available moves in the position (game ends if = 0)
	struct Movelist* moves = Game_get_available_moves(game, LEGALS);
	int size = moves->usedSize; Movelist_free(moves);
	if (size > 0) { return 0; }
	int check = Game_check(game);
	if (check) { return CHECKMATE; }
	else { return STALEMATE; }
}
int Game_piece_alive(struct Game* game, Piece piece)
{
	if (piece == NO_PIECE) { return 0; }

	struct Board* board = game->board;
	//if the piece is not where it was last seen, then it must have been captured, i.e. no longer on the board
	Place place = Board_place_get(board, Piece_unique_id(piece));
	return (Board_square_get(board, place) == piece);
}

double Game_piece_value(struct Game* game, Piece piece)
{
	Team team = Game_turn_get(game);
	Piece enemyKing = Board_piece_get(game->board, (Piece_team(piece)==WHITE_TEAM? TEAM_SIZE : 0));
	Place to = Board_place_get(game->board, Piece_unique_id(enemyKing));
	Place from = Board_place_get(game->board, Piece_unique_id(piece));
	double filedif = Place_file(to) - Place_file(from);
	double rankdif = Place_rank(to) - Place_rank(from);
	double distance = sqrt((filedif*filedif)+(rankdif*rankdif));
	
	//basic heuristic:
	//add value to a piece if it is closer to the enemy king
	//more sophisticated solution to follow
	return PIECE_VALUES[Piece_type(piece)] + (1 - (distance/(BOARD_WIDTH*sqrt(2))));
	//return (double)PIECE_VALUES[Piece_type(piece)];
}

double Game_evaluate(struct Game* game, int depth)
{
	int result = Game_mate(game);
	if (result == STALEMATE) { return 0; }
	if (result == CHECKMATE)
	{
		double matescore = MAX_SCORE + 1;
		if (Game_turn_get(game) == WHITE_TEAM)
		{
			return -(matescore * (1+depth));
		}
		else //(Game_turn_get(game) == BLACK_TEAM)
		{
			return (matescore * (1+depth));
		}
	}
	if (depth <= 0)	//evaluate immediately
	{
		double eval = 0;
		for (Piece_part unique_id = 0; unique_id < TEAM_SIZE; unique_id++)
		{
			Piece piece = Board_piece_get(game->board, unique_id);
			if (Game_piece_alive(game, piece))
			{
				eval += Game_piece_value(game, piece);
			}
		}
		for (Piece_part unique_id = TEAM_SIZE; unique_id < NUM_TEAMS * TEAM_SIZE; unique_id++)
		{
			Piece piece = Board_piece_get(game->board, unique_id);
			if (Game_piece_alive(game, piece))
			{
				eval -= Game_piece_value(game, piece);
			}
		}
		return eval;
	}
	else
	{
		struct Movelist* moves = Game_get_available_moves(game, LEGALS);
		Team mover = Game_turn_get(game);
		double besteval = (mover == WHITE_TEAM ? DBL_MIN : DBL_MAX);
		for (int i = 0; i < moves->usedSize; i++)
		{
			Game_make_move(game, moves->moves[i]);
			double eval = Game_evaluate(game, depth-1);
			if ((mover == WHITE_TEAM && eval > besteval) || (mover==BLACK_TEAM && eval < besteval))
			{
				besteval = eval;
			}
			Game_undo_move(game);
		}
		return besteval;
	}
}

Move Game_best_move(struct Game* game, int searchDepth, int updates)
{
	struct Movelist* moves = Game_get_available_moves(game, LEGALS);
	Team mover = Game_turn_get(game);
	double besteval = (mover == WHITE_TEAM ? DBL_MIN : DBL_MAX);
	int bestindex = -1;
	for (int i = 0; i < moves->usedSize; i++)
	{
		if(updates && rand()%6==0)	//don't have to send every single update
		{
			char progress[100];
			sprintf(progress, "Calculations complete: %d/%d", i, moves->usedSize);
			Discord_out(UPDATE_D, progress);
		}
		Game_make_move(game, moves->moves[i]);
		double eval = Game_evaluate(game, searchDepth);
		if((mover==WHITE_TEAM? eval > besteval : eval < besteval))
		{
			besteval = eval;
			bestindex = i;
		}
		Game_undo_move(game);
		//printf("%d/%d\t", i, moves->usedSize);
	}
	Move best = moves->moves[bestindex];
	Movelist_free(moves);
	return best;
}

Move Game_movify(struct Game* game, Place from, Place to)
{
	struct Board* board = game->board;
	Piece mover = Board_square_get(board, from);
	Piece target = Board_square_get(board, to);
	return Movify(Game_get_unmoved(game, Piece_unique_id(mover)), target, from, to);
}

char* Game_format(struct Game* game)
{
	char* boardf = Board_format(game->board);
	char* movesf = Movelist_format(game->moves);
	char* reset = resetf();
	int size =
		strlen(boardf) + strlen("\n") +
		strlen(reset) +
		strlen(movesf) + strlen("\n") +
		strlen("Turn: ") + strlen((Game_turn_get(game) == WHITE_TEAM ? "White" : "Black")) + strlen("\t") +
		//sizeof(int)*2 is the number of characters to display a hex int
		strlen("Moved vector: ") + (sizeof(int) * 2) + strlen("\n") +
		strlen("Eval: \n") + 100	//allow lots of space for float representation just because
		+ 1; 	//1 more for the null terminator
	char* format = malloc(sizeof(char) * size);
	sprintf(format, "%s\n", boardf);
	sprintf(format, "%s%s", format, reset);
	sprintf(format, "%s%s\n", format, movesf);
	sprintf(format, "%sTurn: %s\t", format, (Game_turn_get(game) == WHITE_TEAM ? "White" : "Black"));
	sprintf(format, "%sMoved vector: %x\n", format, game->moved);
	sprintf(format, "%sEval: %.0lf\n", format, Game_evaluate(game, EVAL_DEPTH));

	free(boardf);
	free(movesf);
	free(reset);
	return format;
}
