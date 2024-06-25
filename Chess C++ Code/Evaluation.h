#pragma once

#include "Game.h"
#include "Move.h"

class Evaluation {
public:
	Evaluation(Move* bestMove, float score);
	Evaluation evaluate(Game& game, int depth=Evaluation::DEFAULT_DEPTH);
	Move* getBestMove();
	float getScore();
private:
	Move* bestMove;
	float score;
	static int DEFAULT_DEPTH;
};