#pragma once

#include <string>

#include "Square.h"

class Move
{
public:
	Square::square_t getMainPieceSquareBefore();
	Square::square_t getMainPieceSquareAfter();
	virtual Square::square_t getCaptureSquare() = 0;

	std::string toString();
protected:
	Move(Square::square_t mainPieceSquareBefore, Square::square_t mainPieceSquareAfter);
private:
	Square::square_t mainPieceSquareBefore;
	Square::square_t mainPieceSquareAfter;
};

class PlainMove : public Move {
public: 
	PlainMove(Square::square_t mainPieceSquareBefore, Square::square_t mainPieceSquareAfter);
	virtual Square::square_t getCaptureSquare() override;
};
