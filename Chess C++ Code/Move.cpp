#include "Move.h"
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

PlainMove::PlainMove(square_t mainPieceSquareBefore, square_t mainPieceSquareAfter) : Move(mainPieceSquareBefore, mainPieceSquareAfter)
{

}