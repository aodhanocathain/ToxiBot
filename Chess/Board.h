#pragma once

#include "Team.h"
#include "Piece.h"
#include "Place.h"

#define BOARD_DIMENSIONS 2
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

struct Board* Board_create();
struct Board* Board_create_default();

Place Board_place_get(struct Board* board, Piece_part unique_id);
Piece Board_square_get(struct Board* board, Place place);
Piece Board_piece_get(struct Board* board, Piece_part unique_id);
void Board_place_set(struct Board* board, Piece_part unique_id, Place place);
void Board_square_set(struct Board* board, Place place, Piece piece);
void Board_piece_set(struct Board* board, Piece_part unique_id, Piece piece);

//Check that the file and rank of a square are within the grid
int Board_contains_place(Place_Spec file, Place_Spec rank);

char* Board_format(struct Board* board);
