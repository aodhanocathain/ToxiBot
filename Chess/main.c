#include <unistd.h>

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "Game.h"
#include "Board.h"
#include "Move.h"
#include "Movelist.h"
#include "Place.h"
#include "Discord.h"

#define MAX_NUM_INPUTS 10
#define MAX_INPUT_SIZE 100

#ifndef DEBUG
	#define SHOW_BOARD {char* boardf = Discord_Board_format(board); Discord_out(GAME_D, boardf); free(boardf);}
#endif
#ifdef DEBUG
	#define SHOW_BOARD {gamef = Game_format(game); printf("%s\n", gamef); free(gamef);}
#endif

//Global variables shared by the main method and command methods

char** inputs;
char* gamef;
struct Game* game;
struct Board* board;
//

void catchresult()
{
	if (Game_mate(game))
	{
		char* gameovermsg = malloc(sizeof(char)*(strlen("White wins") + 1));	//same length as "Black wins", greater length than "Draw"
		if (Game_turn_get(game) == WHITE_TEAM && (Game_mate(game) == CHECKMATE))
		{
			sprintf(gameovermsg, "%s wins", "Black");
		}
		else if (Game_turn_get(game) == BLACK_TEAM && (Game_mate(game) == CHECKMATE))
		{
			sprintf(gameovermsg, "%s wins", "White");
		}
		else
		{
			sprintf(gameovermsg, "Draw");
		}
		Discord_out(RESULT_D, gameovermsg);
		exit(0);
	}
}

void execute_advise()
{
	char* format;
	if (strcmp(inputs[1], "legals") == 0) 
	{
		struct Movelist* moves = Game_get_available_moves(game, LEGALS);
		format = Discord_Movelist_format(moves);
		free(moves);
	}
	else if (strcmp(inputs[1], "best") == 0)
	{
		format = Discord_Move_format(Game_best_move(game, EVAL_DEPTH, UPDATES));
	}
	else if (strcmp(inputs[1], "position") == 0)
	{
		format = malloc(sizeof(char) * 100);	//just because lol
		sprintf(format,
		"The game score is %.0lf at evaluation depth %d.\nAn absolute score greater than %d means there is a forced checkmate seen within said depth.",
		Game_evaluate(game, EVAL_DEPTH), EVAL_DEPTH, MAX_SCORE);
	}
	Discord_out(ADVISE_D, format);
}

void execute_best()
{
	Game_make_best_move(game, UPDATES);
	SHOW_BOARD;
}

void execute_eval()
{
	const char* chars = inputs[1];
	if(!Discord_Move_validate(chars)){Discord_out(ERROR_D, "the move is not properly formatted"); return;}
	
	Place from = Placify_char(chars[0], chars[1]);
	Place to = Placify_char(chars[2], chars[3]);
	Move move = Game_movify(game, from, to);

	struct Movelist* legals = Game_get_available_moves(game, LEGALS);
	if(Movelist_contains(legals, move)==0)
	{
		Discord_out(ERROR_D, "the move is illegal"); return;
	}

	char eval[100];
	Game_make_move(game, move);
	sprintf(eval, "That move evaluates with score %.0lf", Game_evaluate(game, EVAL_DEPTH));
	Discord_out(EVAL_D, eval);
	Game_undo_move(game);
}

void execute_make()
{
	const char* chars = inputs[1];
	
	//check that the user has properly specified their move
	if(!Discord_Move_validate(chars)){Discord_out(ERROR_D, "the move is not properly formatted"); return;}
	
	//construct the move the user specified
	Place from = Placify_char(chars[0], chars[1]);
	Place to = Placify_char(chars[2], chars[3]);
	Move move = Game_movify(game, from, to);
		
	//check if their move is allowed
	struct Movelist* legals = Game_get_available_moves(game, LEGALS);
	if(Movelist_contains(legals, move))
	{
		Game_make_move(game, move);
		SHOW_BOARD;
	}
	else
	{
		Discord_out(ERROR_D, "the move is illegal");
	}
	Movelist_free(legals);
	return;
}

void execute_random()
{
	Game_make_random_move(game);
	SHOW_BOARD;
}

void execute_simulate()
{
	while(1)
	{
		SHOW_BOARD;
		catchresult();
		Game_make_best_move(game, NO_UPDATES);
	}
}

void execute_undo()
{
	if(game->moves->usedSize<=0)
	{
		Discord_out(ERROR_D, "no moves to undo");
	}
	else
	{
		Game_undo_move(game);
		SHOW_BOARD;
	}
}

void(* const EXECUTE[NUM_INTYPES])() = {execute_advise, execute_best, execute_eval, execute_make, execute_random, execute_simulate, execute_undo};
//should match the enums and strings in Discord.h and Discord.c

int main(int argc, const char** argv)
{
	//setup phase
	inputs = malloc(sizeof(char*)*MAX_NUM_INPUTS);
	for(int i=0; i<MAX_NUM_INPUTS; i++)
	{
		inputs[i] = malloc(sizeof(char)*MAX_INPUT_SIZE);
	}

	game = Game_create_default();
	board = game->board;

	SHOW_BOARD;

	int recognized = 0;
	while(1)
	{
		catchresult();
		//CHANGE THIS IN THE FUTURE TO AUTOMATICALLY REPEATEDLY SCAN NEW INPUTS UNTIL IT KNOWS WHAT WE WANT
		scanf("%s %s", inputs[0], inputs[1]);
	
		recognized = 0;
	
		for(intype cmd=0; cmd<NUM_INTYPES; cmd++)
		{
			if(strcmp(inputs[0], IN_HEADERS[cmd])==0)
			{
				recognized = 1;
				EXECUTE[cmd]();
				break;
			}
		}
		
		if(!recognized)
		{
			Discord_out(ERROR_D, "Unrecognized command");
			//execute_eval();
		}
		
		//////
		sleep(1);	//NEVER EVER EVER UNCOMMENT THIS, OR ELSE THE BOT MIGHT START SPAMMING
		/////
	}
	return 0;
}
