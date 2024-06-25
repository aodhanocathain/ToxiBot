#include <algorithm>
#include <functional>
using std::function;
#include <intrin.h>
#include <map>
using std::map;
#include <vector>
using std::vector;

#include "Move.h"
#include "Piece.h"
#include "SquareSet.h"
using SquareSet::squareset_t;
#include "Square.h"
using Square::square_t;

square_t Piece::getSquare() {
	return this->square;
}
int Piece::getId() {
	return this->id;
}

void Piece::setSquare(square_t square) {
	this->square = square;
}

void findFirstBit(unsigned long* lsb, squareset_t attackset) {
	for (int i = 0; i < 64; i++) {
		if ((attackset >> i) & 1) {
			*lsb = i;
			return;
		}
	}
}

vector<Move*> Piece::calculateConsideredMoves(squareset_t friendlyActivePieceLocations, squareset_t oppositionActivePieceLocations) {
	vector<Move*> consideredMoves;
	SquareSet::squareset_t attackset = this->calculateAttackSet(friendlyActivePieceLocations, oppositionActivePieceLocations);
	unsigned long lsb;
	while (attackset != SquareSet::emptySet()) {
		//_BitScanForward64(&lsb, attackset);
		findFirstBit(&lsb, attackset);
		square_t square = lsb;
		attackset = SquareSet::remove(attackset, square);
		consideredMoves.push_back(new PlainMove(this->getSquare(), square));
	}
	return consideredMoves;
}

Piece* Piece::createFrom(char symbol, square_t square, int id) {
	static map<char, function<Piece* (square_t, int)>> creators{
		{King::symbol,[](square_t square, int id) {return new King(square, id); }},
		{Knight::symbol,[](square_t square, int id) {return new Knight(square, id); }}
	};
	return (creators[symbol])(square, id);
}

char Piece::getPlainSymbolFromTeamedSymbol(char teamedSymbol) {
	return toupper(teamedSymbol);
}

Piece::Piece(square_t square, int id) : square(square), id(id) {

}

SquareSet::squareset_t FixedOffsetPiece::calculateAttackSet(SquareSet::squareset_t friendlies, SquareSet::squareset_t opposition) {
	squareset_t attackSet = SquareSet::emptySet();

	square_t square = this->getSquare();
	int rank = Square::rank(square);
	int file = Square::file(square);

	int numPairs = this->getNumOffsetPairs();
	for (int pair = 0; pair < numPairs; pair++)
	{
		int const * offsetPair = this->getOffsetPair(pair);
		int rankOffset = offsetPair[0];
		int fileOffset = offsetPair[1];
		int attackedRank = rank + rankOffset;
		int attackedFile = file + fileOffset;
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

char const King::symbol = 'K';
char King::getClassSymbol() {
	return King::symbol;
}

int const* const King::getOffsetPair(int pair) {
	return (int const* const)(King::offsets + (pair * 2));
}
int King::getNumOffsetPairs() {
	return King::numOffsetPairs;
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

Knight::Knight(square_t square, int id) : FixedOffsetPiece(square, id) {

}

char const Knight::symbol = 'N';
char Knight::getClassSymbol() {
	return Knight::symbol;
}

int const* const Knight::getOffsetPair(int pair) {
	return (int const* const)(Knight::offsets + (pair * 2));
}
int Knight::getNumOffsetPairs() {
	return Knight::numOffsetPairs;
}

int const Knight::numOffsetPairs = 8;
int const Knight::offsets[Knight::numOffsetPairs * 2] = {
	-2, -1,
	-2, 1,
	-1, -2,
	-1, 2,
	1, -2,
	1, 2,
	2, -1,
	2, 1
};