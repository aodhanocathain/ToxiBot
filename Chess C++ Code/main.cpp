#include <iostream>
using std::cout;
using std::endl;
#include <string>
using std::string;
#include <vector>
using std::vector;

#include "Game.h"
#include "Helpers.h"
#include "Move.h"
#include "Team.h"

int main()
{
	Game game;
	string fen = game.calculateFen();
	cout << fen << endl;

	vector<vector<Move*>> moves = game.calculateConsideredMoves();
	for (vector<Move*> movevec : moves) {
		cout << "new vector: " << endl;
		for (vector<Move*>::iterator m = movevec.begin(); m!=movevec.end(); m++) {
			cout << (*m)->toString() << endl;
			cout << (*m)->getMainPieceSquareBefore() << endl;
			cout << (*m)->getMainPieceSquareAfter() << endl;
		}
	}
	
	game.makeMove(moves[0][0]);

	fen = game.calculateFen();
	cout << fen << endl;

	cout << game.kingCapturable();
	cout << game.kingChecked();
	cout << endl;

	game.undoMove();
	fen = game.calculateFen();
	cout << fen << endl;

	return 0;
}