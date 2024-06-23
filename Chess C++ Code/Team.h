#pragma once

#include <array>
#include <memory>
#include <vector>

#include "BitVector64.h"
#include "Constants.h"
#include "Move.h"
#include "Piece.h"
#include "SquareSet.h"

class Team {
public:
	int getNextId();
	Team* getOpposition();
	std::shared_ptr<King> getKing();
	SquareSet::squareset_t getActivePieceLocations();
	BitVector64::bitvector64_t getIdsSeeingOpposingKing();

	virtual char getClassSymbol() = 0;
	virtual char convert(char teamedChar) = 0;

	void registerActivePiece(std::shared_ptr<Piece> piece);
	bool has(std::shared_ptr<Piece>);

	SquareSet::squareset_t calculateAttackSet();
	std::vector<std::vector<Move>> calculateConsideredMoves();


protected:
	Team(Team* opposition);

private:
	int nextId;
	Team* opposition;
	std::shared_ptr<King> king;
	std::array<std::shared_ptr<Piece>, NUM_SQUARES> activePieces;
	std::array<std::shared_ptr<Piece>, NUM_SQUARES> inactivePieces;
	SquareSet::squareset_t activePieceLocations;
	BitVector64::bitvector64_t idsSeeingOpposingKing;
};

class WhiteTeam : public Team {
public:
	WhiteTeam(Team* opposition);
	virtual char getClassSymbol() override;
	virtual char convert(char teamedChar) override;
	static char const symbol;
};

class BlackTeam : public Team {
public:
	BlackTeam(Team* opposition);
	virtual char getClassSymbol() override;
	virtual char convert(char teamedChar) override;
	static char const symbol;
};