#pragma once

#include <array>
#include <map>
#include <memory>
#include <string>
#include <vector>

#include "Constants.h"
#include "Move.h"
#include "Piece.h"
#include "Team.h"

class Game {
public:
	Game(std::string fen = Game::DEFAULT_FEN);

	Team& getMovingTeam();
	WhiteTeam& getWhite();
	BlackTeam& getBlack();

	std::string calculateFen();
	std::vector<std::vector<Move*>> calculateConsideredMoves();
	std::vector<Move*> calculateLegalMoves();

	bool kingCapturable();
	bool kingChecked();

	bool isCheckmate();
	bool isStalemate();

	void makeMove(Move* move);
	void undoMove();

private:
	static std::string DEFAULT_FEN;
	static int MAX_HISTORY;

	WhiteTeam white;
	BlackTeam black;
	std::map<char, Team*> teams;
	Team* movingTeam;
	std::array<std::shared_ptr<Piece>, NUM_SQUARES> pieces;
	std::vector<Move*> playedMoves;

	std::vector<int> validEnPassantFile;
	std::vector<int> halfMoveClock;
	std::vector<int> fullMoveClock;

	std::vector<std::shared_ptr<Piece>> lastMovedPiece;
	std::vector<std::shared_ptr<Piece>> lastTargetPiece;

	std::map<std::string, int> positionCounts;

	std::string getBoardString();
	std::string getTurnString();
	std::string getCastleRightsString();
	std::string getValidEnPassantFileString();
	std::string getHalfMoveString();
	std::string getFullMoveString();
	std::string getPositionString();
};