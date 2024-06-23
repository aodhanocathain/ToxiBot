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

	vector<vector<Move>> moves = game.calculateConsideredMoves();
	for (vector<Move> movevec : moves) {
		cout << "new vector: " << endl;
		for (Move m : movevec) {
			cout << m.toString() << endl;
			cout << m.getMainPieceSquareBefore() << endl;
			cout << m.getMainPieceSquareAfter() << endl;
		}
	}

	cout << game.kingCapturable();
	cout << game.kingChecked();

	return 0;
}