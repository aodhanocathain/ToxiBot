#include <string>
using std::string;

#include "Move.h"
#include "Square.h"
using Square::square_t;

const Move Move::DUMMY_MOVE(Square::DUMMY_SQUARE, Square::DUMMY_SQUARE);

Move::Move(square_t mainPieceSquareBefore, square_t mainPieceSquareAfter) :
	mainPieceSquareBefore(mainPieceSquareBefore), mainPieceSquareAfter(mainPieceSquareAfter)
{}

square_t Move::getMainPieceSquareAfter() const
{
	return this->mainPieceSquareAfter;
}
square_t Move::getMainPieceSquareBefore() const
{
	return this->mainPieceSquareBefore;
}

bool Move::equals(Move& m) const {
	return (this->getMainPieceSquareAfter() == m.getMainPieceSquareAfter()) && (this->getMainPieceSquareBefore() == m.getMainPieceSquareBefore());
}

string Move::toString() {
	return Square::fullString(this->mainPieceSquareBefore) + "->" + Square::fullString(this->mainPieceSquareAfter);
}

const PlainMove PlainMove::DUMMY_PLAINMOVE(Square::DUMMY_SQUARE, Square::DUMMY_SQUARE);

PlainMove::PlainMove(square_t mainPieceSquareBefore, square_t mainPieceSquareAfter) : Move(mainPieceSquareBefore, mainPieceSquareAfter)
{}