#include <iostream>
using std::cout;
using std::endl;
#include <string>
using std::string;
#include <vector>
using std::vector;

#include "Evaluation.h"
#include "Game.h"
#include "Helpers.h"
#include "Move.h"
#include "Team.h"

int main()
{
	Game game;

	string fen = game.calculateFen();
	cout << "fen: " << fen << endl;

	cout << "considered moves:" << endl;
	vector<vector<Move*>> moves = game.calculateConsideredMoves();
	for (vector<Move*> movevec : moves) {
		cout << "new vector: " << endl;
		for (vector<Move*>::iterator m = movevec.begin(); m!=movevec.end(); m++) {
			cout << (*m)->toString() << endl;
		}
	}

	cout << "legal moves:" << endl;
	vector<Move*> legals = game.calculateLegalMoves();
	for (vector<Move*>::iterator m = legals.begin(); m != legals.end(); m++) {
		cout << (*m)->toString() << endl;
	}

	cout << "evaluation:" << endl;
	Evaluation e = Evaluation::evaluate(game, 3);
	cout << e.getScore() << endl;
	vector<Move*> bestLine = e.getBestLine();
	for (vector<Move*>::reverse_iterator i = bestLine.rbegin(); i < bestLine.rend(); i++) {
		cout << (*i)->toString() << '\t';
	}
	cout << endl;

	return 0;
}