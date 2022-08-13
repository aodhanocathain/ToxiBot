#include <stdio.h>

#include "Board.h"
#include "Piece.h"
#include "Place.h"
#include "Team.h"
#include "Colours.h"

void Board_put_piece(struct Board* board, Piece piece, Place place)
{
	Piece_part unique_id = Piece_unique_id(piece);
	Board_piece_set(board, unique_id, piece);
	Board_place_set(board, unique_id, place);
	Board_square_set(board, place, piece);
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
	Board_put_piece(board, Piecify(BLACK_TEAM, 0, KING), Placify_char('e', '8'));

	//knights
	Board_put_piece(board, Piecify(WHITE_TEAM, 1, KNIGHT), Placify_char('a', '1'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 2, KNIGHT), Placify_char('b', '1'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 3, KNIGHT), Placify_char('c', '1'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 4, KNIGHT), Placify_char('d', '1'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 5, KNIGHT), Placify_char('f', '1'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 6, KNIGHT), Placify_char('g', '1'));
	Board_put_piece(board, Piecify(WHITE_TEAM, 7, KNIGHT), Placify_char('h', '1'));
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

void Board_print(struct Board* board)
{
	//print file names along the top of the board
	colour(GRID_TEXT);
	for (int file = 0; file < BOARD_WIDTH; file++)
	{
		printf(" %c ", file + 'a');
	}
	reset_colours();
	printf("\n");

	//print each rank's contents, followed by their rank names
	for (int rank = BOARD_WIDTH - 1; rank >= 0; rank--)
	{
		for (int file = 0; file < BOARD_WIDTH; file++)
		{
			//colour the square itself
			if ((file + rank) % 2) { colour(BOARD_LIGHT_BACKGROUND); }
			else { colour(BOARD_DARK_BACKGROUND); }

			//print the square's piece, if it has one
			printf(" ");
			Piece_print(Board_square_get(board, Placify_int(file, rank)));
			printf(" ");
		}

		//print the rank name
		reset_colours();
		colour(GRID_TEXT);
		printf(" %c\n", rank + '1');
		reset_colours();
	}
}

void Board_print_Discord(struct Board* board)
{
	char boardstring[BOARD_SQUARES+1];
	boardstring[BOARD_SQUARES] = 0;
	char* preface = "GAME ";
	int index=0;
	for(int rank=7; rank>=0; rank--)
	{
		for(int file=0; file<8; file++)
		{
			boardstring[index++] = Piece_charify_Discord(Board_square_get(board, Placify_int(file, rank)));
		}
	}
	printf("%s%s\n", preface, boardstring);
}
