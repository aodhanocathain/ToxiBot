#include "Game.h"
#include "Piece.h"
#include "Square.h"

#include <stdlib.h>

char* GAME_DEFAULT_FEN_STRING = "k7/8/8/8/8/8/8/K7";

Game* Game_create(char* FENString)
{
	Game* game = (Game*)malloc(sizeof(Game));
	
	int i = 0;
	char currentChar = FENString[i];
	
	int rank=0;
	int file=0;
	while(currentChar!=0)
	{
		if(currentChar=='/')
		{
			rank++;
			file=0;
		}
		else
		{
			unsigned int asciiOffset = currentChar - MIN_RANK_CHAR;
			if(asciiOffset < NUM_RANKS)
			{
				for(int offset=0; offset<=asciiOffset; offset++)
				{
					game->pieces[Square_make(rank,file)] = NULL;
					file++;
				}
			}
			else
			{
				Piece* piece = Piece_create(currentChar, 0);
				game->pieces[Square_make(rank,file)] = piece;
				file++;
			}
		}
		currentChar = FENString[++i];
	}
	
	return game;
}

char* Game_toString(Game* game)
{
	char* string = (char*)malloc(sizeof(char)*100);
	int i = 0;
	for(int rank=NUM_RANKS-1; rank>=0; rank--)
	{
		int filesSinceLastPiece = 0;
		for(int file=0; file<NUM_FILES; file++)
		{
			Piece* piece = game->pieces[Square_make(rank,file)];
			if(piece!=NULL)
			{
				if(filesSinceLastPiece>0)
				{
					string[i++] = '0'+filesSinceLastPiece;
				}
				filesSinceLastPiece = 0;
				//string[i++] = PIECE_TYPE_CHARS[piece->type];
				string[i++] = 'L';
			}
			else
			{
				filesSinceLastPiece++;
			}
		}
		if(filesSinceLastPiece>0)
		{
			string[i++] = '0'+filesSinceLastPiece;
		}
		if(rank>0)
		{
			string[i++] = '/';
		}
	}
	string[i] = 0;
	return string;
	//return "test";
}