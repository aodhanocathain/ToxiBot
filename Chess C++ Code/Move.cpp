#include <string>
using std::string;

#include "Move.h"
#include "Square.h"
using Square::square_t;

Move::Move(square_t mainPieceSquareBefore, square_t mainPieceSquareAfter)
{
	this->mainPieceSquareAfter = mainPieceSquareAfter;
	this->mainPieceSquareBefore = mainPieceSquareBefore;
}

square_t Move::getMainPieceSquareAfter()
{
	return this->mainPieceSquareAfter;
}
square_t Move::getMainPieceSquareBefore()
{
	return this->mainPieceSquareBefore;
}

string Move::toString() {
	return Square::fullString(this->mainPieceSquareBefore) + "->" + Square::fullString(this->mainPieceSquareAfter);
}

PlainMove::PlainMove(square_t mainPieceSquareBefore, square_t mainPieceSquareAfter) : Move(mainPieceSquareBefore, mainPieceSquareAfter)
{

}

square_t PlainMove::getCaptureSquare() {
	return this->getMainPieceSquareAfter();
}