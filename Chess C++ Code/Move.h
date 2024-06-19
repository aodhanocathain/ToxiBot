#pragma once

#include "Square.h"

class Move
{
public:
	Square::square_t getMainPieceSquareBefore();
	Square::square_t getMainPieceSquareAfter();
protected:
	Move(Square::square_t mainPieceSquareBefore, Square::square_t mainPieceSquareAfter);
private:
	Square::square_t mainPieceSquareBefore;
	Square::square_t mainPieceSquareAfter;
};

class PlainMove : public Move {
public: 
	PlainMove(Square::square_t mainPieceSquareBefore, Square::square_t mainPieceSquareAfter);
};
