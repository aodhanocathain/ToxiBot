#include <iostream>
using std::cout;
#include <string>
using std::string;
#include <vector>
using std::vector;

#include "Game.h"
#include "Helpers.h"
#include "Piece.h"
#include "Square.h"
using Square::square_t;
using Square::rank_t;
using Square::file_t;
#include "SquareSet.h"
using SquareSet::squareset_t;
#include "StackContainer.h"
#include "Team.h"

//string Game::DEFAULT_FEN = "4k3/8/8/8/8/8/8/4K3 b KQkq - 0 1";
//string Game::DEFAULT_FEN = "4k3/8/8/8/4K3/8/8/8 w KQkq - 0 1";
//string Game::DEFAULT_FEN = "1n2k1n1/8/8/8/8/8/8/1N2K1N1 w KQkq - 0 1";
//string Game::DEFAULT_FEN = "7k/8/6N1/6K1/8/8/8/8 w - - 0 1";
//string Game::DEFAULT_FEN = "6nk/8/6KN/8/8/8/8/8 w - - 0 1";

//string Game::DEFAULT_FEN = "k7/8/3N4/1N6/2NN4/8/8/7K w - - 0 1";	//checkmate in 2 with only knights and kings

//string Game::DEFAULT_FEN = "8/8/4k3/7R/R7/8/8/3K4 w - - 0 1";	//rook ladder checkmate in 7 plies

//string Game::DEFAULT_FEN = "7k/8/4B1K1/8/7B/8/8/8 w - - 0 1";	//checkmate in 1 with only bishops and kings

//string Game::DEFAULT_FEN = "7k/8/R6K/8/8/8/8/8 w - - 0 1";	//checkmate in 1 with only rooks and kings
//string Game::DEFAULT_FEN = "R6k/8/7K/8/8/8/8/8 b - - 0 1";	//checkmate already

//string Game::DEFAULT_FEN = "7k/8/7K/7Q/8/8/8/8 w - - 0 1";	//checkmate in 1 with only queens and kings

//string Game::DEFAULT_FEN = "rnbqkbnr/8/8/8/8/8/8/RNBQKBNR w KQkq - 0 1";

//string Game::DEFAULT_FEN = "4k3/p7/1P6/8/8/8/8/4K3 b KQkq - 0 1";

//string Game::DEFAULT_FEN = "1k6/3Q4/8/2K5/8/8/8/8 w - - 0 1";
//string Game::DEFAULT_FEN = "1k6/3Q4/8/8/3K4/8/8/8 w - - 0 1";
string Game::DEFAULT_FEN = "1k6/3Q4/8/8/8/3K4/8/8 w - - 0 1";

//string Game::DEFAULT_FEN = "3rr3/7p/b4p2/p4B2/P1p2Pp1/2Pp2Pk/5K2/R4N2 w - - 0 1";	//will probably require depth 8 to solve

Game::Game(string fen) : 
	teams{ Team(Team::WHITE, &(teams[Team::BLACK])), Team(Team::BLACK, &(teams[Team::WHITE]))},
	white(&(teams[Team::WHITE])),
	black(&(teams[Team::BLACK]))
{

	this->counter = 0;

	//initialize empty board
	for (int rank = 0; rank < NUM_RANKS; rank++) {
		for (int file = 0; file < NUM_FILES; file++) {
			square_t s = Square::make(rank, file);
			this->pieces[s] = nullptr;
		}
	}

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
				Piece::type_t type = (Piece::type_t)(Piece::getTypeOfPlainSymbol(pieceSymbol));

				square_t square = Square::make(rank, file);

				Team::type_t teamType = Team::getTypeOfPieceSymbol(current);
				Team* team = teamType == Team::WHITE ? white : black;
				int id = team->getNextId();

				team->createAndRegisterActivePiece(type, square, id);

				this->pieces[square] = team->getPiece(id);

				file++;
			}
		}
		rank++;
	}

	//initialize which turn it is
	string turnString = fenParts[1];
	char turnTeamSymbol = turnString[0];
	Team::type_t teamType = Team::getTypeOfTeamSymbol(turnTeamSymbol);
	this->movingTeam = (this->teams) + (int)teamType;
	
	//initialize which file (if any) contains a pawn on which a valid en-passant capture could be performed
	string enPassantFileString = fenParts[3];
	char enPassantFile = enPassantFileString[0];
	UnderivedState s;
	if (enPassantFile == NO_ENPASSANT_CHAR) {
		s.enPassantFile = Square::DUMMY_FILE;
	}
	else {
		s.enPassantFile = enPassantFile - MIN_FILE_CHAR;
	}

	//initialize move clocks
	string halfMoveString = fenParts[4];
	s.halfMoveClock = halfMoveString[0] - '0';
	string fullMoveString = fenParts[5];
	s.fullMoveClock = fullMoveString[0] - '0';

	this->history.push(s);
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

Team* Game::getMovingTeam() {
	return this->movingTeam;
}

Team* Game::getWhite() {
	return this->white;
}

Team* Game::getBlack() {
	return this->black;
}

Team* Game::getTeamOfTeamedChar(char teamedChar) {
	if (this->white->convert(teamedChar)==teamedChar) {
		return this->white;
	}
	else {
		return this->black;
	}
}

Piece* Game::getPiece(square_t square) {
	return this->pieces[square];
}

bool Game::kingCapturable() {
	return SquareSet::has(this->movingTeam->calculateAttackSet(), this->movingTeam->getOpposition()->getKing()->getSquare());
}

bool Game::kingChecked() {
	return SquareSet::has(this->movingTeam->getOpposition()->calculateAttackSet(), this->movingTeam->getKing()->getSquare());
}

void Game::makeMove(PlainMove move) {
	this->counter++;
	square_t beforeSquare = move.getMainPieceSquareBefore();
	square_t afterSquare = move.getMainPieceSquareAfter();
	square_t captureSquare = afterSquare;

	Piece* captureTarget = this->pieces[captureSquare];
	//assume the captured piece is always going to be the opposition of the moving team
	if (captureTarget) {
		this->movingTeam->getOpposition()->deactivatePiece(captureTarget->getId());
	}

	this->pieces[captureSquare] = nullptr;
	Piece* movingPiece = this->pieces[beforeSquare];
	this->pieces[beforeSquare] = nullptr;

	movingPiece->setSquare(afterSquare);
	this->pieces[afterSquare] = movingPiece;

	squareset_t friendlies = this->movingTeam->getActivePieceLocations();
	friendlies = SquareSet::add(friendlies, afterSquare);
	friendlies = SquareSet::remove(friendlies, beforeSquare);
	this->movingTeam->setActivePieceLocations(friendlies);

	UnderivedState prev = this->history.last();
	UnderivedState s(move,Square::DUMMY_FILE,prev.halfMoveClock + 1,prev.fullMoveClock + (this->movingTeam == this->black ? 1 : 0),movingPiece,captureTarget);

	//this->history[this->nextHistoryIndex++] = s;
	this->history.push(s);

	this->movingTeam = this->movingTeam->getOpposition();
}
void Game::undoMove() {
	UnderivedState s = this->history.pop();
	PlainMove move = s.playedMove;
	Piece* movingPiece = s.movedPiece;
	Piece* captureTarget = s.targettedPiece;
	this->movingTeam = this->movingTeam->getOpposition();

	square_t beforeSquare = move.getMainPieceSquareBefore();
	square_t afterSquare = move.getMainPieceSquareAfter();
	square_t captureSquare = afterSquare;

	this->pieces[beforeSquare] = movingPiece;
	squareset_t friendlies = this->movingTeam->getActivePieceLocations();
	friendlies = SquareSet::add(friendlies, beforeSquare);
	friendlies = SquareSet::remove(friendlies, afterSquare);
	friendlies = SquareSet::add(friendlies, beforeSquare);
	movingPiece->setSquare(beforeSquare);
	this->pieces[afterSquare] = nullptr;
	this->movingTeam->setActivePieceLocations(friendlies);

	if (captureTarget) {
		this->movingTeam->getOpposition()->activatePiece(captureTarget->getId());
	}
	this->pieces[captureSquare] = captureTarget;
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
			Piece* piece = this->pieces[square];
			if (piece)
			{
				if (emptySquares > 0)
				{
					//denote how many empty squares separate pieces
					rankString = rankString + string(1, '0' + emptySquares);
					emptySquares = 0;
				}
				//find which team owns this piece, so that its symbol can be appropriately converted for the string
				if (this->white->has(piece->getId())) {
					rankString = rankString + this->white->convert(piece->getSymbol());
				}
				else {
					rankString = rankString + this->black->convert(piece->getSymbol());
				}
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
	return string(1, this->movingTeam->getSymbol());
}

string Game::getCastleRightsString() {
	return "KQkq";
}

string Game::getValidEnPassantFileString() {
	UnderivedState s = this->history.last();
	return (Square::validFile(s.enPassantFile) ? Square::fileString(s.enPassantFile) : "-");;
}

string Game::getHalfMoveString() {
	return string(1, '0' + this->history.last().halfMoveClock);
}

string Game::getFullMoveString() {
	return string(1, '0' + this->history.last().fullMoveClock);
}

//not to be used for display purposes, only for counting occurences of each position
string Game::getPositionString() {
	return this->getBoardString() + this->getTurnString() + this->getCastleRightsString() + this->getValidEnPassantFileString();
}