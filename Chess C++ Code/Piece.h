#pragma once

#include "Square.h"
#include "SquareSet.h"

class Piece {
public:
	static Piece* createFrom(char symbol, Square::square_t square, int id);
	static char getPlainSymbolFromTeamedSymbol(char teamedSymbol);

	virtual char getClassSymbol() = 0;
	virtual SquareSet::squareset_t getAttackSet() = 0;
	Square::square_t getSquare();
	int getId();

protected:
	Piece(Square::square_t square, int id);

private:
	Square::square_t square;
	int id;
};

class FixedOffsetPiece : public Piece {
public:
	virtual SquareSet::squareset_t getAttackSet() override;
protected:
	FixedOffsetPiece(Square::square_t square, int id);
	virtual int const * const getOffsetPair(int pair) = 0;
	virtual int getNumOffsetPairs() = 0;
};

class King final : public FixedOffsetPiece {
public:
	King(Square::square_t square, int id);
	static char const symbol;
	virtual char getClassSymbol() override;
protected:
	virtual int const * const getOffsetPair(int pair) override;
	virtual int getNumOffsetPairs() override;
private:
	static int const numOffsetPairs;
	static int const offsets[];
};