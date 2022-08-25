#include <stdio.h>
#include <stdlib.h>

#include "Discord.h"
#include "Board.h"
#include "Piece.h"
#include "Move.h"
#include "Place.h"
#include "Movelist.h"

char* OUT_HEADERS[NUM_OUTTYPES] = { "ADVICE", "ERROR", "GAME", "RESULT", "UPDATE"};
char* IN_HEADERS[NUM_INTYPES] = {"ADVISE", "BEST", "EVAL", "MAKE", "RANDOM", "SIMULATE", "UNDO"};	//match the enums in Discord.c

//Interfacing with the discord bot program
void Discord_out(outtype o, const char* message)
{
	fprintf(stdout, "%s %s\n", OUT_HEADERS[o], message);
	fflush(stdout);
}

int Discord_Move_validate(const char* fromto)
{
	//moves expected in the format {from file}{from rank}{to file}{to rank}, e.g. "e2e4"
	if(fromto[0]<'a' || fromto[0]>('a'+BOARD_WIDTH)){return 0;}
	if(fromto[1]<'1' || fromto[1]>('1'+BOARD_WIDTH)){return 0;}
	if(fromto[2]<'a' || fromto[2]>('a'+BOARD_WIDTH)){return 0;}
	if(fromto[3]<'1' || fromto[3]>('1'+BOARD_WIDTH)){return 0;}
	return 1;
}

char* Discord_Piece_format(Piece piece)
{
	#define CHARS_PER_PIECE 1
	char* format = malloc(sizeof(char)*(CHARS_PER_PIECE + 1));	//+1 for a null terminator
	sprintf(format, "%c", 'a'+ (piece==NO_PIECE? (NUM_TEAMS*NUM_PIECE_TYPES) : ((Piece_team(piece)*NUM_PIECE_TYPES) + Piece_type(piece))));
	//the above formatting is explained in protocol text file
	return format;
	#undef CHARS_PER_PIECE
}

#define CHARS_PER_MOVE 4
char* Discord_Move_format(Move move)
{
	char* format = malloc(sizeof(char)*(CHARS_PER_MOVE + 1));
	char* fromf = Place_format(Move_from(move));
	char* tof = Place_format(Move_to(move));
	sprintf(format, "%s%s", fromf, tof);
	free(fromf);
	free(tof);
	return format;
}

char* Discord_Movelist_format(struct Movelist* movelist)
{
	//(some characters and a space) for each move in the list, then a null character
	char* format = malloc(sizeof(char)*((movelist->usedSize*(CHARS_PER_MOVE+1)) + 1));	format[0] = 0;
	char* helperf;
	for(int i=0; i<movelist->usedSize; i++)
	{
		helperf = Discord_Move_format(movelist->moves[i]);
		sprintf(format, "%s%s ", format, helperf);
		free(helperf);
	}
	return format;
}
#undef CHARS_PER_MOVE

char* Discord_Board_format(struct Board* board)
{
	char* format = malloc(sizeof(char)*(BOARD_SQUARES+1));	format[0] = 0;
	char* helperf;
	for(int rank=BOARD_WIDTH-1; rank>=0; rank--)
	{
		for(int file=0; file<BOARD_WIDTH; file++)
		{
			helperf = Discord_Piece_format(Board_square_get(board, Placify_int(file, rank)));
			sprintf(format, "%s%s", format, helperf);
			free(helperf);
		}
	}
	return format;
}