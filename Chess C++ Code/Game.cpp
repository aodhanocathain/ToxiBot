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
//string Game::DEFAULT_FEN = "4k3/8/8/8/4K3/8/8/8 w KQkq - 0 1";
//string Game::DEFAULT_FEN = "1n2k1n1/8/8/8/8/8/8/1N2K1N1 w KQkq - 0 1";
//string Game::DEFAULT_FEN = "7k/8/6N1/6K1/8/8/8/8 w - - 0 1";
//string Game::DEFAULT_FEN = "6nk/8/6KN/8/8/8/8/8 w - - 0 1";

//string Game::DEFAULT_FEN = "k7/8/3N4/1N6/2NN4/8/8/7K w - - 0 1";	//checkmate in 2 with only knights and kings

//string Game::DEFAULT_FEN = "7k/8/4B1K1/8/7B/8/8/8 w - - 0 1";	//checkmate in 1 with only bishops and kings

//string Game::DEFAULT_FEN = "7k/8/R6K/8/8/8/8/8 w - - 0 1";	//checkmate in 1 with only rooks and kings

//string Game::DEFAULT_FEN = "7k/8/7K/7Q/8/8/8/8 w - - 0 1";	//checkmate in 1 with only queens and kings

//string Game::DEFAULT_FEN = "rnbqkbnr/8/8/8/8/8/8/RNBQKBNR w KQkq - 0 1";

string Game::DEFAULT_FEN = "4k3/p7/1P6/8/8/8/8/4K3 b KQkq - 0 1";

int Game::MAX_HISTORY = 256;

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
				square_t square = Square::make(rank, file);
				map<char, Team*>::const_iterator symbolTeamPair = std::find_if(this->teams.cbegin(), this->teams.cend(), [current](std::pair<char, Team*> pair) {
					//find the team whose converter has been applied to the piece symbol, which means the piece is on that team
					return pair.second->convert(current) == current;
				});
				int id = symbolTeamPair->second->getNextId();
				shared_ptr<Piece> piece(pieceSymbol==Pawn::symbol? new Pawn(square, id, symbolTeamPair->second->getClassPawnIncrement(), symbolTeamPair->second->getClassPawnStartRank()) :Piece::createFrom(pieceSymbol, square, id));

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
	this->validEnPassantFile = vector<int>(Game::MAX_HISTORY);
	if (enPassantFile == NO_ENPASSANT_CHAR) {
		this->validEnPassantFile.push_back(Square::DUMMY_FILE);
	}
	else {
		this->validEnPassantFile.push_back(enPassantFile - MIN_FILE_CHAR);
	}

	//initialize move clocks
	this->halfMoveClock = vector<int>(Game::MAX_HISTORY);
	string halfMoveString = fenParts[4];
	this->halfMoveClock.push_back(halfMoveString[0] - '0');
	this->fullMoveClock = vector<int>(Game::MAX_HISTORY);
	string fullMoveString = fenParts[5];
	this->fullMoveClock.push_back(fullMoveString[0] - '0');

	this->positionCounts[this->getPositionString()] = 1;
}

string Game::calculateFen()
{
	string boardString = this->getBoardString();
	string turnString = this->getTurnString();
	string castleRightsString = this->getCastleRightsString();
	string enPassantFileString = this->getValidEnPassantFileString();
	string halfMoveClockString = this->getHalfMoveString();
	string fullMoveClockString = this->getFullMoveString();
	return boardString + " " + turnString + " " + castleRightsString + " " + enPassantFileString + " " + halfMoveClockString + " " + fullMoveClockString;
}

Team& Game::getMovingTeam() {
	return *(this->movingTeam);
}

WhiteTeam& Game::getWhite() {
	return this->white;
}

BlackTeam& Game::getBlack() {
	return this->black;
}

vector<vector<Move*>> Game::calculateConsideredMoves() {
	return this->movingTeam->calculateConsideredMoves();
}

vector<Move*> Game::calculateLegalMoves() {
	vector<Move*> legals;
	vector<vector<Move*>> movelists = this->calculateConsideredMoves();
	for (vector<vector<Move*>>::iterator list = movelists.begin(); list != movelists.end(); list++) {
		for (vector<Move*>::iterator move = (*list).begin(); move != (*list).end(); move++) {
			this->makeMove(*move);
			if (!(this->kingCapturable())) {
				legals.push_back(*move);
			}
			this->undoMove();
		}
	}
	return legals;
}

bool Game::kingCapturable() {
	return SquareSet::has(this->movingTeam->calculateAttackSet(), this->movingTeam->getOpposition()->getKing()->getSquare());
}

bool Game::kingChecked() {
	return SquareSet::has(this->movingTeam->getOpposition()->calculateAttackSet(), this->movingTeam->getKing()->getSquare());
}

bool Game::isCheckmate() {
	return (this->calculateLegalMoves().size() == 0) && this->kingChecked();
}

bool Game::isStalemate() {
	return (this->calculateLegalMoves().size() == 0) && !(this->kingChecked());
}

void Game::makeMove(Move* move) {
	square_t captureSquare = move->getCaptureSquare();
	shared_ptr<Piece> captureTarget = this->pieces[captureSquare];
	//assume the captured piece is always going to be the opposition of the moving team
	if (captureTarget) {
		this->movingTeam->getOpposition()->deactivatePiece(captureTarget);
	}
	this->pieces[captureSquare].reset();
	if (captureTarget) {
		//update castle rights
	}

	shared_ptr<Piece> movingPiece = this->pieces[move->getMainPieceSquareBefore()];
	movingPiece->setSquare(move->getMainPieceSquareAfter());
	this->pieces[move->getMainPieceSquareAfter()] = movingPiece;
	this->movingTeam->setActivePieceLocations(SquareSet::add(this->movingTeam->getActivePieceLocations(), move->getMainPieceSquareAfter()));
	//update castle rights

	this->pieces[move->getMainPieceSquareBefore()].reset();
	this->movingTeam->setActivePieceLocations(SquareSet::remove(this->movingTeam->getActivePieceLocations(), move->getMainPieceSquareBefore()));

	//if move is castle move...
	//if move is promotion move...
	//if move is pawn move...

	this->validEnPassantFile.push_back(Square::DUMMY_FILE);
	this->playedMoves.push_back(move);
	this->lastMovedPiece.push_back(movingPiece);
	this->lastTargetPiece.push_back(captureTarget);
	this->halfMoveClock.push_back(this->halfMoveClock.back() + 1);
	this->fullMoveClock.push_back(this->fullMoveClock.back() + (this->movingTeam == &(this->black) ? 1 : 0));

	this->movingTeam = this->movingTeam->getOpposition();

	/*
	string positionString = this->getPositionString();
	if (this->positionCounts.find(positionString) == this->positionCounts.end()) {
		this->positionCounts[positionString] = 1;
	}
	else {
		this->positionCounts[positionString]++;
	}
	*/
}
void Game::undoMove() {
	//this->positionCounts[this->getPositionString()]--;
	this->movingTeam = this->movingTeam->getOpposition();
	this->fullMoveClock.pop_back();
	this->halfMoveClock.pop_back();
	shared_ptr<Piece> captureTarget = this->lastTargetPiece.back();
	this->lastTargetPiece.pop_back();
	shared_ptr<Piece> movingPiece = this->lastMovedPiece.back();
	this->lastMovedPiece.pop_back();
	Move* move = this->playedMoves.back();
	this->playedMoves.pop_back();
	this->validEnPassantFile.pop_back();

	this->pieces[move->getMainPieceSquareBefore()] = movingPiece;
	this->movingTeam->setActivePieceLocations(SquareSet::add(this->movingTeam->getActivePieceLocations(), move->getMainPieceSquareBefore()));

	movingPiece->setSquare(move->getMainPieceSquareBefore());
	this->pieces[move->getMainPieceSquareAfter()].reset();
	this->movingTeam->setActivePieceLocations(SquareSet::remove(this->movingTeam->getActivePieceLocations(), move->getMainPieceSquareAfter()));
	//update castle rights

	square_t captureSquare = move->getCaptureSquare();
	if (captureTarget) {
		this->movingTeam->getOpposition()->activatePiece(captureTarget);
	}
	this->pieces[captureSquare] = captureTarget;
	if (captureTarget) {
		//update castle rights
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
			square_t square = Square::make(rank, file);
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

string Game::getTurnString() {
	return string(1, this->movingTeam->getClassSymbol());
}

string Game::getCastleRightsString() {
	return "KQkq";
}

string Game::getValidEnPassantFileString() {
	return (Square::validFile(this->validEnPassantFile.back()) ? Square::fileString(this->validEnPassantFile.back()) : "-");;
}

string Game::getHalfMoveString() {
	return string(1, '0' + this->halfMoveClock.back());
}

string Game::getFullMoveString() {
	return string(1, '0' + this->fullMoveClock.back());
}

//not to be used for display purposes, only for counting occurences of each position
string Game::getPositionString() {
	return this->getBoardString() + this->getTurnString() + this->getCastleRightsString() + this->getValidEnPassantFileString();
}