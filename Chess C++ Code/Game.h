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
	std::string getFen();
private:
	static std::string DEFAULT_FEN;
	std::shared_ptr<Team> white;
	std::shared_ptr<Team> black;
	std::map<char, std::shared_ptr<Team>> teams;
	std::array<std::shared_ptr<Piece>, NUM_SQUARES> pieces;

	std::shared_ptr<Team> movingTeam;
	std::vector<Move> playedMoves;

	int validEnPassantFile;
	int halfMoveClock;
	int fullMoveClock;

	std::string getBoardString();
	std::string getCastleRightsString();
};