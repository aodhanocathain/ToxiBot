#include <algorithm>
#include <functional>
using std::function;
#include <map>
using std::map;

#include "Piece.h"
#include "SquareSet.h"
using SquareSet::squareset_t;
#include "Square.h"
using Square::square_t;

Piece* Piece::createFrom(char symbol, square_t square, int id) {
	static map<char, function<Piece* (square_t, int)>> creators{
		{King::symbol,[](square_t square, int id) {return new King(square, id); }}
	};
	return (creators[symbol])(square, id);
}

char Piece::getPlainSymbolFromTeamedSymbol(char teamedSymbol) {
	return toupper(teamedSymbol);
}

square_t Piece::getSquare() {
	return this->square;
}

int Piece::getId() {
	return this->id;
}

Piece::Piece(square_t square, int id) : square(square), id(id) {

}

SquareSet::squareset_t FixedOffsetPiece::getAttackSet() {
	squareset_t attackSet = SquareSet::emptySet();

	square_t square = this->getSquare();
	int rank = Square::rank(square);
	int file = Square::file(square);

	int numPairs = this->getNumOffsetPairs();
	for (int pair = 0; pair < numPairs; pair++)
	{
		int const * const offsetPair = this->getOffsetPair(pair);
		int const rankOffset = offsetPair[0];
		int const fileOffset = offsetPair[1];
		int const attackedRank = rank + rankOffset;
		int const attackedFile = file + fileOffset;
		if (Square::validRankAndFile(attackedRank, attackedFile))
		{
			square_t attackedSquare = Square::ofRankAndFile(attackedRank, attackedFile);
			attackSet = SquareSet::add(attackSet, attackedSquare);
		}
	}
	return attackSet;
}

FixedOffsetPiece::FixedOffsetPiece(square_t square, int id) : Piece(square, id) {

}

King::King(square_t square, int id) : FixedOffsetPiece(square, id) {

}

char King::getSymbol() {
	return this->symbol;
}

int const King::numOffsetPairs = 8;
int const King::offsets[King::numOffsetPairs*2] = {
	-1, -1,
	-1, 0,
	-1, 1,
	0, -1,
	0, 1,
	1, -1,
	1, 0,
	1, 1
};
char const King::symbol = 'K';

int const * const King::getOffsetPair(int pair) {
	return (int const * const) (King::offsets + (pair*2));
}
int King::getNumOffsetPairs() {
	return King::numOffsetPairs;
}