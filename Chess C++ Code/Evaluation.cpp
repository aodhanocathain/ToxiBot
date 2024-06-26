#include <iostream>

#include <vector>
using std::vector;

#include "Evaluation.h"
#include "Game.h"
#include "Move.h"

Evaluation::Evaluation(float score, vector<Move*> bestLine) : score(score), bestLine(bestLine) {

}

Evaluation Evaluation::evaluate(Game& game, int depth) {
	if (depth == 0) {
		return Evaluation(game.getWhite().calculatePoints() - game.getBlack().calculatePoints(), vector<Move*>(0));
	}
	if (game.isCheckmate()) {
		Evaluation e = Evaluation(game.getMovingTeam().getWorstScore(), vector<Move*>(0));
		std::cout << "checkmate:" << game.calculateFen() << std::endl;
		return e;
	}
	if (game.isStalemate()) {
		Evaluation e = Evaluation(0, vector<Move*>(0));
		std::cout << "stalemate:" << game.calculateFen() << std::endl;
		return e;
	}

	vector<Move*> legals = game.calculateLegalMoves();

	Move* bestMove = *(legals.begin());
	game.makeMove(bestMove);
	Evaluation bestEval = Evaluation::evaluate(game, depth - 1);
	game.undoMove();
	for (vector<Move*>::iterator j = legals.begin() + 1; j != legals.end(); j++) {
		Move* m = *j;
		game.makeMove(m);
		Evaluation eval = Evaluation::evaluate(game, depth - 1);
		game.undoMove();
		if (game.getMovingTeam().prefers(eval.getScore(), bestEval.getScore())) {
			bestEval = eval;
			bestMove = m;
		}
	}
	bestEval.bestLine.push_back(bestMove);
	return bestEval;
}

float Evaluation::getScore() {
	return this->score;
}

vector<Move*> Evaluation::getBestLine() {
	return this->bestLine;
}