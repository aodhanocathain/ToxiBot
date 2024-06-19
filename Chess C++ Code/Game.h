#pragma once

#include <array>
#include <map>
#include <memory>
#include <string>

#include "Constants.h"
#include "Piece.h"
#include "Team.h"

class Game {
public:
	Game(std::string fen = Game::DEFAULT_FEN);
	std::string getBoardString();
	std::string getFen();
private:
	static std::string DEFAULT_FEN;
	std::map<char, std::shared_ptr<Team>> teams;
	std::shared_ptr<Team> white;
	std::shared_ptr<Team> black;
	std::array<std::shared_ptr<Piece>, NUM_SQUARES> pieces;
};