#pragma once

#include <array>
#include <memory>

#include "BitVector64.h"
#include "Constants.h"
#include "Piece.h"
#include "SquareSet.h"

class Team {
public:
	static char getSymbol();
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
	static char getSymbol();
	virtual char convert(char teamedChar) override;
};

class BlackTeam : public Team {
public:
	BlackTeam();
	static char getSymbol();
	virtual char convert(char teamedChar) override;
};