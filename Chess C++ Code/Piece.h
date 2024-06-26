#pragma once

#include <vector>

#include "Move.h"
#include "Square.h"
#include "SquareSet.h"

class Piece {
public:
	Square::square_t getSquare();
	int getId();

	virtual char getClassSymbol() = 0;
	virtual float getClassPoints() = 0;

	void setSquare(Square::square_t square);

	virtual SquareSet::squareset_t calculateAttackSet(SquareSet::squareset_t friendlyActivePieceLocations, SquareSet::squareset_t oppositionActivePieceLocations) = 0;
	virtual std::vector<Move*> calculateConsideredMoves(SquareSet::squareset_t friendlyActivePieceLocations, SquareSet::squareset_t oppositionActivePieceLocations);

	static Piece* createFrom(char symbol, Square::square_t square, int id);
	static char getPlainSymbolFromTeamedSymbol(char teamedSymbol);

protected:
	Piece(Square::square_t square, int id);

private:
	Square::square_t square;
	int id;
};

class FixedOffsetPiece : public Piece {
public:
	virtual SquareSet::squareset_t calculateAttackSet(SquareSet::squareset_t friendlies, SquareSet::squareset_t opposition) override;
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
	virtual float getClassPoints() override;
protected:
	virtual int const * const getOffsetPair(int pair) override;
	virtual int getNumOffsetPairs() override;
private:
	static float const points;
	static int const numOffsetPairs;
	static int const offsets[];
};

class Knight final : public FixedOffsetPiece {
public:
	Knight(Square::square_t square, int id);
	static char const symbol;
	virtual char getClassSymbol() override;
	virtual float getClassPoints() override;
protected:
	virtual int const* const getOffsetPair(int pair) override;
	virtual int getNumOffsetPairs() override;
private:
	static float const points;
	static int const numOffsetPairs;
	static int const offsets[];
};

class DirectionPiece : public Piece {
public:
	virtual SquareSet::squareset_t calculateAttackSet(SquareSet::squareset_t friendlies, SquareSet::squareset_t opposition) override;
protected:
	DirectionPiece(Square::square_t square, int id);
	virtual int const* const getDirectionOffsets(int direction) = 0;
	virtual int getNumDirections() = 0;
};

class Bishop final : public DirectionPiece {
public:
	Bishop(Square::square_t square, int id);
	static char const symbol;
	virtual char getClassSymbol() override;
	virtual float getClassPoints() override;
protected:
	virtual int const* const getDirectionOffsets(int direction) override;
	virtual int getNumDirections() override;
private:
	static float const points;
	static int const numDirections;
	static int const directionsOffsets[];
};

class Rook final : public DirectionPiece {
public:
	Rook(Square::square_t square, int id);
	static char const symbol;
	virtual char getClassSymbol() override;
	virtual float getClassPoints() override;
protected:
	virtual int const* const getDirectionOffsets(int direction) override;
	virtual int getNumDirections() override;
private:
	static float const points;
	static int const numDirections;
	static int const directionsOffsets[];
};

class Queen final : public DirectionPiece {
public:
	Queen(Square::square_t square, int id);
	static char const symbol;
	virtual char getClassSymbol() override;
	virtual float getClassPoints() override;
protected:
	virtual int const* const getDirectionOffsets(int direction) override;
	virtual int getNumDirections() override;
private:
	static float const points;
	static int const numDirections;
	static int const directionsOffsets[];
};