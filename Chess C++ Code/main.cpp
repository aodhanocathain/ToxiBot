#include <iostream>
using std::cout;
using std::endl;
#include <string>
using std::string;
#include <vector>
using std::vector;

#include "Game.h"
#include "Helpers.h"
#include "Team.h"

int main()
{
	Game game;
	string fen = game.getFen();
	cout << fen << endl;

	vector<string> splits = Helpers::string_split("l1l2l3l", 'l');
	for (string s : splits)
	{
		cout << s << "." << endl;
	}

	/*
	vector<string> splits = Helpers::string_split("4k3/8/8/8/8/8/8/4K3 w KQkq - 0 1", ' ');
	cout << splits.size() << endl;
	for (vector<string>::iterator i = splits.begin(); i != splits.end(); i++)
	{
		cout << *i << endl;
	}

	vector<string> rankstrings = Helpers::string_split(splits[0], '/');
	for (vector<string>::iterator i = rankstrings.begin(); i != rankstrings.end(); i++)
	{
		cout << *i << endl;
	}
	*/

	return 0;
}