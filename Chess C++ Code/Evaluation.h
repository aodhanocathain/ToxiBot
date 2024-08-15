#pragma once

#include "Game.h"
#include "Move.h"
#include "StackContainer.h"

class Evaluation {
public:
	static int const MAX_DEPTH = 8;
	float getScore();
	StackContainer<PlainMove, Evaluation::MAX_DEPTH> getBestLine();
	static Evaluation evaluate(Game& game, int maxDepth = Evaluation::MAX_DEPTH);
	Evaluation(float score, StackContainer<PlainMove, Evaluation::MAX_DEPTH> bestLine);

private:
	float score;
	StackContainer<PlainMove, Evaluation::MAX_DEPTH> bestLine;
	static float ABscore(Game& game, StackContainer<PlainMove, Evaluation::MAX_DEPTH>& bestLineReturn, int maxDepth = Evaluation::MAX_DEPTH, int currentDepth = 0, float opposingTeamAssuredScore = NAN);
};