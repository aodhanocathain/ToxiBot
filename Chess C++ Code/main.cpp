#include <ctime>

#include <iostream>
using std::cout;
using std::endl;
#include <string>
using std::string;

#include "Evaluation.h"
#include "Game.h"
#include "Helpers.h"
#include "Move.h"
#include "Square.h"
using Square::square_t;
#include "SquareSet.h"
using SquareSet::squareset_t;
#include "StackContainer.h"
#include "Team.h"

int main()
{
	Game game;
	
	long long t1, t2;
	double ms, ns;

	int searchDepth = 8;

	game.counter = 0;
	cout << "evaluate" << endl;
	t1 = clock();
	Evaluation e = Evaluation::evaluate(game, searchDepth);
	t2 = clock();
	ms = t2 - t1;
	cout << "time : " << ms << "ms" << endl;
	cout << "score: " << e.getScore() << endl;

	cout << "counter: " << game.counter << endl;
	ns = ms * 1000000;
	cout << "ns/position: " << ns / game.counter << endl;

	StackContainer<PlainMove, Evaluation::MAX_DEPTH> bestLine = e.getBestLine();
	for (int i = e.getBestLine().getNextFreeIndex() - 1; i >= 0; i--) {
		cout << bestLine[i].toString() << '\t';
	}
	
	return 0;
}