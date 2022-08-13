#pragma once

#include <stdlib.h>

#include "Team.h"
#include "Piece.h"
#include "Place.h"

#define BOARD_WIDTH 8
#define BOARD_SQUARES BOARD_WIDTH*BOARD_WIDTH
#define BOARD_PIECES NUM_TEAMS*TEAM_SIZE

struct Board
{
	//The piece (if any) at each square on the board
	Piece squares[BOARD_SQUARES];	//indexed by the Place representation of the square
	//The Place representation of each piece's square
	Place places[BOARD_PIECES];	//indexed by the piece's unique id
	//The pieces themselves
	Piece pieces[BOARD_PIECES];	//indexed by the piece's unique id
};

//Check that the file and rank of a square are within the grid
static inline int Board_contains_place(Spec file, Spec rank)
{
	return (file < BOARD_WIDTH) && (rank < BOARD_WIDTH);
}

static inline struct Board* Board_create()
{
	return malloc(sizeof(struct Board));
}
struct Board* Board_create_default();

static inline Place Board_place_get(struct Board* board, Piece_part unique_id)
{
	return board->places[unique_id];
}
static inline Piece Board_square_get(struct Board* board, Place place)
{
	return board->squares[place];
}
static inline Piece Board_piece_get(struct Board* board, Piece_part unique_id)
{
	return board->pieces[unique_id];
}

static inline void Board_place_set(struct Board* board, Piece_part unique_id, Place place)
{
	board->places[unique_id] = place;
}
static inline void Board_square_set(struct Board* board, Place place, Piece piece)
{
	board->squares[place] = piece;
}
static inline void Board_piece_set(struct Board* board, Piece_part unique_id, Piece piece)
{
	board->pieces[unique_id] = piece;
}

void Board_print(struct Board* board);
void Board_print_Discord(struct Board* board);
