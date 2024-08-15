#pragma once

#include <string>

#include "Constants.h"
#include "Move.h"
#include "Piece.h"
#include "StackContainer.h"
#include "Team.h"

class Game {
public:
	class UnderivedState {
	public:
		UnderivedState(PlainMove playedMove = PlainMove::DUMMY_PLAINMOVE, int enPassantFile = Square::DUMMY_FILE, int halfMoveClock = -1, int fullMoveClock = -1, Piece* movedPiece = nullptr, Piece* targettedPiece = nullptr) :
			playedMove(playedMove), enPassantFile(enPassantFile), halfMoveClock(halfMoveClock), fullMoveClock(fullMoveClock), movedPiece(movedPiece), targettedPiece(targettedPiece)
		{}
		PlainMove playedMove;
		int enPassantFile;
		int halfMoveClock;
		int fullMoveClock;
		Piece* movedPiece;
		Piece* targettedPiece;
	};

	Game(std::string fen = Game::DEFAULT_FEN);

	Team* getWhite();
	Team* getBlack();
	Team* getMovingTeam();

	Piece* getPiece(Square::square_t square);

	Team* getTeamOfTeamedChar(char teamedChar);

	std::string calculateFen();

	bool kingCapturable();
	bool kingChecked();

	void makeMove(PlainMove move);
	void undoMove();

	int counter;
private:
	static std::string DEFAULT_FEN;
	static const int MAX_HISTORY = 256;

	Team teams[2];

	Team* white;
	Team* black;
	Team* movingTeam;

	StackContainer<Piece*, NUM_SQUARES> pieces;
	StackContainer<UnderivedState, MAX_HISTORY> history;

	std::string getBoardString();
	std::string getTurnString();
	std::string getCastleRightsString();
	std::string getValidEnPassantFileString();
	std::string getHalfMoveString();
	std::string getFullMoveString();
	std::string getPositionString();
};