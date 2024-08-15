#pragma once

#include <string>

#include "Square.h"

class Move
{
public:
	static const Move DUMMY_MOVE;
	Square::square_t getMainPieceSquareBefore() const;
	Square::square_t getMainPieceSquareAfter() const;
	
	bool equals(Move& m) const;

	std::string toString();
protected:
	Move(Square::square_t mainPieceSquareBefore = Square::DUMMY_SQUARE, Square::square_t mainPieceSquareAfter = Square::DUMMY_SQUARE);
private:
	Square::square_t mainPieceSquareBefore;
	Square::square_t mainPieceSquareAfter;
};

class PlainMove final : public Move {
public: 
	static const PlainMove DUMMY_PLAINMOVE;
	PlainMove(Square::square_t mainPieceSquareBefore = Square::DUMMY_SQUARE, Square::square_t mainPieceSquareAfter = Square::DUMMY_SQUARE);
};
