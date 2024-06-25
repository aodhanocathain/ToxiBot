#include "Evaluation.h"
#include "Move.h"

Evaluation::Evaluation(Move* bestMove, float score) : bestMove(bestMove), score(score) {

}

Evaluation Evaluation::evaluate(Game& game, int depth) {
	return Evaluation(nullptr, 0);
}

Move* Evaluation::getBestMove() {
	return this->bestMove;
}

float Evaluation::getScore() {
	return this->score;
}

int Evaluation::DEFAULT_DEPTH = 2;