#pragma once

#include <array>
#include <vector>

#include "Game.h"
#include "Move.h"

class Evaluation {
public:
	float getScore();
	std::vector<Move*> getBestLine();
	static Evaluation evaluate(Game& game, int depth);

private:
	Evaluation(float score, std::vector<Move*> bestLine);
	float score;
	std::vector<Move*> bestLine;
};