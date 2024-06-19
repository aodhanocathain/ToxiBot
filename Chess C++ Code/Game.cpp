#include <algorithm>
#include <functional>
using std::function;
#include <map>
using std::map;
#include <memory>
using std::shared_ptr;
#include <string>
using std::string;
#include <vector>
using std::vector;

#include "Game.h"
#include "Helpers.h"
#include "Piece.h"
#include "Square.h"
using Square::square_t;

string Game::DEFAULT_FEN = "4k3/8/8/8/8/8/8/4K3 w KQkq - 0 1";

Game::Game(string fen) {
	this->white = shared_ptr<Team>(new WhiteTeam());
	this->black = shared_ptr<Team>(new BlackTeam());
	this->teams = std::map<char, shared_ptr<Team>> {
		{WhiteTeam::getSymbol(),this->white},
		{BlackTeam::getSymbol(),this->black}
	};

	vector<string> fenParts = Helpers::string_split(fen, ' ');
	string board = fenParts.at(0);
	vector<string> rankStrings = Helpers::string_split(board, '/');
	int rank = 0;
	for (vector<string>::const_reverse_iterator rankIt = rankStrings.crbegin(); rankIt != rankStrings.crend(); rankIt++)
	{
		string rankString = *rankIt;

		int file = 0;
		for (string::const_iterator charIt = rankString.cbegin(); charIt != rankString.cend(); charIt++)
		{
			char current = *charIt;
			if (current >= '0' && current <= '9')
			{
				file = file + (current - '0');
			}
			else
			{
				char pieceSymbol = Piece::getPlainSymbolFromTeamedSymbol(current);
				square_t square = Square::ofRankAndFile(rank, file);
				map<char, shared_ptr<Team>>::const_iterator symbolTeamPair = std::find_if(this->teams.cbegin(), this->teams.cend(), [current](std::pair<char, shared_ptr<Team>> pair) {
					//find the team whose converter has been applied to the piece symbol, which means the piece is on that team
					return pair.second->convert(current) == current;
				});
				int id = symbolTeamPair->second->getNextId();
				shared_ptr<Piece> piece(Piece::createFrom(pieceSymbol, square, id));

				this->pieces[square] = piece;
				this->teams[symbolTeamPair->first]->registerActivePiece(piece);
				file++;
			}
		}
		rank++;
	}
}

string Game::getBoardString() {
	string boardString = "";
	for (int rank = NUM_RANKS - 1; rank >= 0; rank--)
	{
		string rankString = "";
		int emptySquares = 0;
		for (int file = 0; file < NUM_FILES; file++)
		{
			square_t square = Square::ofRankAndFile(rank, file);
			shared_ptr<Piece> piece = this->pieces[square];
			if (piece)
			{
				if (emptySquares > 0)
				{
					//denote how many empty squares separate pieces
					rankString = rankString + string(1, '0' + emptySquares);
					emptySquares = 0;
				}
				//find which team owns this piece, so that its symbol can be appropriately converted for the string
				map<char, shared_ptr<Team>>::const_iterator symbolTeamPair = std::find_if(this->teams.cbegin(), (this->teams.cend()), [piece](std::pair<char, shared_ptr<Team>> pair) {
					return pair.second->has(piece);
				});
				rankString = rankString + symbolTeamPair->second->convert(piece->getSymbol());
			}
			else
			{
				emptySquares++;
			}
		}
		if (emptySquares > 0)
		{
			//denote how many empty squares separate the last piece in the rank and the end of the rank
			rankString = rankString + string(1, '0' + emptySquares);
		}
		boardString = boardString + rankString;
		if (rank > 0) {
			boardString = boardString + "/";
		}
	}
	return boardString;
}

string Game::getFen()
{
	return this->getBoardString();
}