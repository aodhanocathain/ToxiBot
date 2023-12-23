#include "Game.h"
#include "Piece.h"
#include "Square.h"
#include "Team.h"

#include <stdlib.h>

char* GAME_DEFAULT_FEN_STRING = "k7/8/8/8/8/8/8/K7";

Game* Game_create(char* FENString)
{
	Game* game = (Game*)malloc(sizeof(Game));
	
	game->teams[WHITE_TEAM_TYPE] = Team_create(WHITE_TEAM_TYPE);
	game->teams[BLACK_TEAM_TYPE] = Team_create(BLACK_TEAM_TYPE);
	
	game->movingTeam = game->teams[WHITE_TEAM_TYPE];	//for now
	
	int charIndex = 0;
	char currentChar = FENString[charIndex];
	
	int rank=NUM_RANKS-1;	//the board string lists ranks in descending order
	int file=0;
	while(currentChar!=0)
	{
		if(currentChar=='/')	//delimits different ranks in the board string
		{
			rank--;
			file=0;
		}
		else
		{
			unsigned int asciiOffset = currentChar - MIN_RANK_CHAR;
			if(asciiOffset < NUM_RANKS)
			//numeric character indicates a number of consecutive empty squares in the same rank
			{
				for(int offset=0; offset<=asciiOffset; offset++)
				{
					game->pieces[Square_create(rank,file)] = NULL;
					file++;
				}
			}
			else	//(assumed alphabetic) character indicates a piece
			{
				enum PIECE_TYPE pieceType = Piece_type_of_teamedChar(currentChar);
				enum TEAM_TYPE teamType = Team_type_of_teamedChar(currentChar);
				
				Team* team = game->teams[teamType];
				int id = (team->numPieces)++;
				
				Piece* piece = Piece_create(teamType, pieceType, id);
				
				team->activePieces[id] = piece;
				team->inactivePieces[id] = NULL;
				game->pieces[Square_create(rank,file)] = piece;
				
				file++;
			}
		}
		currentChar = FENString[++charIndex];
	}
	
	return game;
}

char* Game_toString(Game* game)
{
	char* string = (char*)malloc(sizeof(char)*100);
	int charIndex = 0;
	for(int rank=NUM_RANKS-1; rank>=0; rank--)	//list ranks in descending order
	{
		int filesSinceLastPiece = 0;
		for(int file=0; file<NUM_FILES; file++)
		{
			Piece* piece = game->pieces[Square_create(rank,file)];
			if(piece!=NULL)
			{
				if(filesSinceLastPiece>0)
				{
					string[charIndex++] = '0'+filesSinceLastPiece;	//denote number of empty squares since last piece
				}
				filesSinceLastPiece = 0;
				string[charIndex++] = TEAM_TYPE_CHAR_CONVERTERS[piece->teamType](PIECE_TYPE_CHARS[piece->pieceType]);
			}
			else
			{
				filesSinceLastPiece++;
			}
		}
		if(filesSinceLastPiece>0)	//denote number of empty squares before end of rank
		{
			string[charIndex++] = '0'+filesSinceLastPiece;
		}
		if(rank>0)	//delimit rank strings except for the last rank (rank 0)
		{
			string[charIndex++] = '/';
		}
	}
	string[charIndex] = 0;
	return string;
}

Move* Game_moves(Game* game)
{
	Move movesArray[NUM_SQUARES*NUM_SQUARES];	//definitely WAY less than this
	int nextMoveIndex = 0;
	
	for(int id=0; id<game->movingTeam->numPieces; id++)
	{
		Piece* piece = game->movingTeam->activePieces[id];
		if(piece != NULL)
		{
			Piece_addMoves(piece, &(movesArray[nextMoveIndex]));
		}
	}
	Move* movesList = (Move*)malloc(sizeof(Move)*nextMoveIndex+1);
	for(int i=0; i<nextMoveIndex; i++)
	{
		movesList[i] = movesArray[i];
	}
	movesList[nextMoveIndex] = DUMMY_MOVE;
	
	return movesList;
}