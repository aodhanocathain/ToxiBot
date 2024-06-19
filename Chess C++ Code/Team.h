#pragma once

#include <array>
#include <memory>

#include "BitVector64.h"
#include "Constants.h"
#include "Piece.h"
#include "SquareSet.h"

class Team {
public:
	virtual char getClassSymbol() = 0;
	virtual char convert(char teamedChar) = 0;

	int getNextId();
	void registerActivePiece(std::shared_ptr<Piece> piece);

	bool has(std::shared_ptr<Piece>);

protected:
	Team();

private:
	std::array<std::shared_ptr<Piece>, NUM_SQUARES> activePieces;
	std::array<std::shared_ptr<Piece>, NUM_SQUARES> inactivePieces;
	int nextId;
	SquareSet::squareset_t activePieceLocations;
	BitVector64::bitvector64_t idsSeeingOpposingKing;
};

class WhiteTeam : public Team {
public:
	WhiteTeam();
	virtual char getClassSymbol() override;
	virtual char convert(char teamedChar) override;
	static char const symbol;
};

class BlackTeam : public Team {
public:
	BlackTeam();
	virtual char getClassSymbol() override;
	virtual char convert(char teamedChar) override;
	static char const symbol;
};