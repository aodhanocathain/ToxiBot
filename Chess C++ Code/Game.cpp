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
#include "Team.h"

//string Game::DEFAULT_FEN = "4k3/8/8/8/8/8/8/4K3 b KQkq - 0 1";
string Game::DEFAULT_FEN = "4k3/8/8/8/4K3/8/8/8 w KQkq - 0 1";
//string Game::DEFAULT_FEN = "1n2k1n1/8/8/8/8/8/8/1N2K1N1 w KQkq - 0 1";
//string Game::DEFAULT_FEN = "7k/8/6N1/6K1/8/8/8/8 w - - 0 1";

//string Game::DEFAULT_FEN = 

Game::Game(string fen) : white(WhiteTeam(&(this->black))), black(BlackTeam(&(this->white))) {

	//initialize teams
	this->teams = std::map<char, Team*> {
		{WhiteTeam::symbol,&(this->white)},
		{BlackTeam::symbol,&(this->black)}
	};

	vector<string> fenParts = Helpers::string_split(fen, ' ');

	//initialize pieces from the board state
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
				map<char, Team*>::const_iterator symbolTeamPair = std::find_if(this->teams.cbegin(), this->teams.cend(), [current](std::pair<char, Team*> pair) {
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

	//initialize which turn it is
	string turnString = fenParts[1];
	char turnTeamSymbol = turnString[0];
	this->movingTeam = std::find_if(this->teams.cbegin(), this->teams.cend(), [turnTeamSymbol](std::pair<char, Team*> pair) {
		return pair.second->getClassSymbol() == turnTeamSymbol;
	})->second;

	//initialize which file (if any) contains a pawn on which a valid en-passant capture could be performed
	string enPassantFileString = fenParts[3];
	char enPassantFile = enPassantFileString[0];
	if (enPassantFile == NO_ENPASSANT_CHAR) {
		this->validEnPassantFile = Square::DUMMY_FILE;
	}
	else {
		this->validEnPassantFile = enPassantFile - MIN_FILE_CHAR;
	}

	//initialize move clocks
	string halfMoveString = fenParts[4];
	this->halfMoveClock = halfMoveString[0] - '0';
	string fullMoveString = fenParts[5];
	this->fullMoveClock = fullMoveString[0] - '0';
}

string Game::calculateFen()
{
	string boardString = this->getBoardString();
	string turnString = string(1, this->movingTeam->getClassSymbol());
	string castleRightsString = this->getCastleRightsString();
	string enPassantFileString = (Square::validFile(this->validEnPassantFile) ? Square::fileString(this->validEnPassantFile) : "-");
	string halfMoveClockString = string(1, '0' + this->halfMoveClock);
	string fullMoveClockString = string(1, '0' + this->fullMoveClock);
	return boardString + " " + turnString + " " + castleRightsString + " " + enPassantFileString + " " + halfMoveClockString + " " + fullMoveClockString;
}

vector<vector<Move>> Game::calculateConsideredMoves() {
	return this->movingTeam->calculateConsideredMoves();
}

bool Game::kingCapturable() {
	return SquareSet::has(this->movingTeam->calculateAttackSet(), this->movingTeam->getOpposition()->getKing()->getSquare());
}

bool Game::kingChecked() {
	return SquareSet::has(this->movingTeam->getOpposition()->calculateAttackSet(), this->movingTeam->getKing()->getSquare());
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
				map<char, Team*>::const_iterator symbolTeamPair = std::find_if(this->teams.cbegin(), (this->teams.cend()), [piece](std::pair<char, Team*> pair) {
					return pair.second->has(piece);
				});
				rankString = rankString + symbolTeamPair->second->convert(piece->getClassSymbol());
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

string Game::getCastleRightsString() {
	return "KQkq";
}