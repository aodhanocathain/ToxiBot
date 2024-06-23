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

	std::string calculateFen();
	std::vector<std::vector<Move>> calculateConsideredMoves();

	bool kingCapturable();
	bool kingChecked();

private:
	static std::string DEFAULT_FEN;

	WhiteTeam white;
	BlackTeam black;
	std::map<char, Team*> teams;
	Team* movingTeam;
	std::array<std::shared_ptr<Piece>, NUM_SQUARES> pieces;
	std::vector<Move> playedMoves;

	int validEnPassantFile;
	int halfMoveClock;
	int fullMoveClock;

	std::string getBoardString();
	std::string getCastleRightsString();
};