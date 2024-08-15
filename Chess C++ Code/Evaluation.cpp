#include <cmath>

#include "Evaluation.h"
#include "Game.h"
#include "Move.h"
#include "Square.h"
using Square::square_t;
#include "SquareSet.h"
using SquareSet::squareset_t;
#include "StackContainer.h"

Evaluation::Evaluation(float score, StackContainer<PlainMove, Evaluation::MAX_DEPTH> bestLine) : score(score), bestLine(bestLine)
{}

Evaluation Evaluation::evaluate(Game& game, int maxDepth) {
	StackContainer<PlainMove, Evaluation::MAX_DEPTH> bestLine;
	float score = Evaluation::ABscore(game, bestLine, maxDepth);
	return Evaluation(score, bestLine);
}

float Evaluation::ABscore(Game& game, StackContainer<PlainMove, Evaluation::MAX_DEPTH>& bestLineReturn, int maxDepth, int currentDepth, float opposingTeamAssuredScore) {
	if (game.kingCapturable()) {
		return NAN;
	}

	if (currentDepth == maxDepth) {
		return game.getWhite()->getCombinedPieceValues() - game.getBlack()->getCombinedPieceValues();
	}

	Team* movingTeam = game.getMovingTeam();
	Team* opposition = movingTeam->getOpposition();

	StackContainer<PlainMove, Evaluation::MAX_DEPTH> currentBest;
	StackContainer<PlainMove, Evaluation::MAX_DEPTH> temp;

	PlainMove bestMove = PlainMove::DUMMY_PLAINMOVE;
	float bestScore = NAN;

	int const numIds = movingTeam->getNextId();
	squareset_t const friendlies = movingTeam->getActivePieceLocations();
	squareset_t const enemies = opposition->getActivePieceLocations();
	squareset_t emptySet = SquareSet::emptySet();
	for (int id = 0; id < numIds; id++) {
		if (movingTeam->has(id)) {
			Piece* p = movingTeam->getPiece(id);
			squareset_t attackSet = p->calculateAttackSet(friendlies, enemies);
			square_t square = p->getSquare();
			while (attackSet != emptySet) {
				square_t leastSquare = SquareSet::getLowestSquare(attackSet);
				PlainMove nextMove(square, leastSquare);
				game.makeMove(nextMove);
				temp.reset();
				float nextScore = Evaluation::ABscore(game, temp, maxDepth, currentDepth + 1, bestScore);
				game.undoMove();
				bool locallyPreferred = (std::isnan(bestScore) && !(std::isnan(nextScore))) || (movingTeam->prefers(nextScore, bestScore));
				if (locallyPreferred) {
					bestMove = nextMove;
					bestScore = nextScore;
					currentBest = temp;
					if (opposition->prefers(opposingTeamAssuredScore, bestScore)) {
						return bestScore;
					}
				}
				attackSet = SquareSet::remove(attackSet, leastSquare);
			}
		}
	}

	if (PlainMove::DUMMY_PLAINMOVE.equals(bestMove)) {
		return game.kingChecked() ? movingTeam->getWorstScore() + (opposition->getScoreMultiplier() * (maxDepth - currentDepth)) : 0;
	}
	else
	{
		currentBest.push(bestMove);
		bestLineReturn = currentBest;
		return bestScore;
	}
}

float Evaluation::getScore() {
	return this->score;
}

StackContainer<PlainMove, Evaluation::MAX_DEPTH> Evaluation::getBestLine() {
	return this->bestLine;
}