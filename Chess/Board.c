#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "Board.h"
#include "Piece.h"
#include "Place.h"
#include "Team.h"
#include "Colours.h"

//private, helps Board_create_default set up the board
void Board_put_piece(struct Board* board, Piece piece, Place place)
{
	Piece_part unique_id = Piece_unique_id(piece);
	Board_piece_set(board, unique_id, piece);
	Board_place_set(board, unique_id, place);
	Board_square_set(board, place, piece);
}

struct Board* Board_create()
{
	return malloc(sizeof(struct Board));
}
struct Board* Board_create_default()
{
	struct Board* board = Board_create();

	//empty the board of any junk in the memory it was allocated

	for (Place i = 0; i < BOARD_SQUARES; i++)
	{
		Board_square_set(board, i, NO_PIECE);
	}

	for (Piece_part unique_id = 0; unique_id < BOARD_PIECES; unique_id++)
	{
		Board_place_set(board, unique_id, NO_PLACE);
		Board_piece_set(board, unique_id, NO_PIECE);
	}

	//Place pieces in their default squares

	//kings
	Board_put_piece(board, Piecify(WHITE_TEAM, 0, KING), Placify_char('e', '1'));
	//Board_put_piece(board, Piecify(BLACK_TEAM, 0, KING), Placify_char('e', '8'));
	Board_put_piece(board, Piecify(BLACK_TEAM, 0, KING), Placify_char('e', '8'));

	//knights
	/*
	Board_put_piece(board, Piecify(WHITE_TEAM, 1, KNIGHT), Placify_char('a', '1'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 2, KNIGHT), Placify_char('b', '1'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 3, KNIGHT), Placify_char('c', '1'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 4, KNIGHT), Placify_char('d', '1'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 5, KNIGHT), Placify_char('f', '1'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 6, KNIGHT), Placify_char('g', '1'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 7, KNIGHT), Placify_char('h', '1'));
	*/
	Board_put_piece(board, Piecify(WHITE_TEAM, 8, KNIGHT), Placify_char('a', '2'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 9, KNIGHT), Placify_char('b', '2'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 10, KNIGHT), Placify_char('c', '2'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 11, KNIGHT), Placify_char('d', '2'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 12, KNIGHT), Placify_char('e', '2'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 13, KNIGHT), Placify_char('f', '2'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 14, KNIGHT), Placify_char('g', '2'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 15, KNIGHT), Placify_char('h', '2'));

	return board;
}

Place Board_place_get(struct Board* board, Piece_part unique_id)
{
	return board->places[unique_id];
}
Piece Board_square_get(struct Board* board, Place place)
{
	return board->squares[place];
}
Piece Board_piece_get(struct Board* board, Piece_part unique_id)
{
	return board->pieces[unique_id];
}

void Board_place_set(struct Board* board, Piece_part unique_id, Place place)
{
	board->places[unique_id] = place;
}
void Board_square_set(struct Board* board, Place place, Piece piece)
{
	board->squares[place] = piece;
}
void Board_piece_set(struct Board* board, Piece_part unique_id, Piece piece)
{
	board->pieces[unique_id] = piece;
}

//Check that the file and rank of a square are within the grid
int Board_contains_place(Place_Spec file, Place_Spec rank)
{
	return (file < BOARD_WIDTH) && (rank < BOARD_WIDTH);
}

#define BOARD_SQUARE_STRING_SHAPE COLOUR_APPLY_STRING_SHAPE " " PIECE_STRING_SHAPE COLOUR_APPLY_STRING_SHAPE " "
char* Board_format(struct Board* board)
{
	char* bresetf = colourf(RESET_BACKGROUND);
	int size =	//size = (num ranks * length per rank) + null terminator
	//num ranks
	(BOARD_WIDTH * (
	//length per rank = (num files * length per square) + colour reset + newline character
	(BOARD_WIDTH*strlen(BOARD_SQUARE_STRING_SHAPE)) + strlen(COLOUR_RESET_STRING_SHAPE) + strlen("\n")   ))
	+1;	//+1 for the null terminator

	char* format = malloc(sizeof(char) * size);	format[0] = 0;

	char* helperf;
	for (int rank = BOARD_WIDTH - 1; rank >= 0; rank--)
	{
		for (int file = 0; file < BOARD_WIDTH; file++)
		{
			if ((file + rank) % 2) { helperf = colourf(BOARD_LIGHT_BACKGROUND); }
			else { helperf = colourf(BOARD_DARK_BACKGROUND); }
			sprintf(format, "%s%s ", format, helperf); free(helperf);

			Piece piece = Board_square_get(board, Placify_int(file, rank));
			helperf = Piece_format(piece);
			sprintf(format, "%s%s", format, helperf); free(helperf);

			helperf = colourf(RESET_TEXT);
			sprintf(format, "%s%s ", format, helperf); free(helperf);
		}
		helperf = resetf();
		sprintf(format, "%s%s\n", format, helperf);
		free(helperf);
	}

	return format;
}