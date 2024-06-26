#include <algorithm>
#include <functional>
using std::function;
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

vector<Move*> Piece::calculateConsideredMoves(squareset_t friendlyActivePieceLocations, squareset_t oppositionActivePieceLocations) {
	vector<Move*> consideredMoves;
	squareset_t attackset = this->calculateAttackSet(friendlyActivePieceLocations, oppositionActivePieceLocations);
	squareset_t moveset = SquareSet::differ(attackset, friendlyActivePieceLocations);
	square_t currentSquare = this->getSquare();
	squareset_t emptyset = SquareSet::emptySet();
	while (moveset != emptyset) {
		square_t leastSquare = SquareSet::getLowestSquare(moveset);
		moveset = SquareSet::remove(moveset, leastSquare);
		consideredMoves.push_back(new PlainMove(currentSquare, leastSquare));
	}
	return consideredMoves;
}

Piece* Piece::createFrom(char symbol, square_t square, int id) {
	static map<char, function<Piece* (square_t, int)>> creators{
		{King::symbol,[](square_t square, int id) {return new King(square, id); }},
		{Knight::symbol,[](square_t square, int id) {return new Knight(square, id); }},
		{Bishop::symbol,[](square_t square, int id) {return new Bishop(square, id); }},
		{Rook::symbol,[](square_t square, int id) {return new Rook(square, id); }},
		{Queen::symbol,[](square_t square, int id) {return new Queen(square, id); }}
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
float King::getClassPoints() {
	return King::points;
}

int const* const King::getOffsetPair(int pair) {
	return (int const* const)(King::offsets + (pair * 2));
}
int King::getNumOffsetPairs() {
	return King::numOffsetPairs;
}

float const King::points = 0;
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
float Knight::getClassPoints() {
	return Knight::points;
}

int const* const Knight::getOffsetPair(int pair) {
	return (int const* const)(Knight::offsets + (pair * 2));
}
int Knight::getNumOffsetPairs() {
	return Knight::numOffsetPairs;
}

float const Knight::points = 3;
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

squareset_t DirectionPiece::calculateAttackSet(squareset_t friendlies, squareset_t opposition) {
	squareset_t attackSet = SquareSet::emptySet();
	squareset_t obstacles = SquareSet::unify(friendlies, opposition);

	square_t square = this->getSquare();
	int rank = Square::rank(square);
	int file = Square::file(square);

	int numDirections = this->getNumDirections();
	for (int direction = 0; direction < numDirections; direction++)
	{
		int const* offsetPair = this->getDirectionOffsets(direction);
		int rankOffset = offsetPair[0];
		int fileOffset = offsetPair[1];

		int newRank = rank + rankOffset;
		int newFile = file + fileOffset;

		bool blocked = false;
		bool valid = Square::validRankAndFile(newRank, newFile);
		while (valid && !blocked) {
			square_t newSquare = Square::ofRankAndFile(newRank, newFile);
			attackSet = SquareSet::add(attackSet, newSquare);

			blocked = SquareSet::has(obstacles, newSquare);

			newRank += rankOffset;
			newFile += fileOffset;

			valid = Square::validRankAndFile(newRank, newFile);
		}
	}
	return attackSet;
}

DirectionPiece::DirectionPiece(square_t square, int id) : Piece(square, id){

}

Bishop::Bishop(square_t square, int id) : DirectionPiece(square, id) {

}

char Bishop::getClassSymbol() {
	return Bishop::symbol;
}
float Bishop::getClassPoints() {
	return Bishop::points;
}
int const* const Bishop::getDirectionOffsets(int direction) {
	return Bishop::directionsOffsets + (2*direction);
}
int Bishop::getNumDirections() {
	return Bishop::numDirections;
}

char const Bishop::symbol = 'B';
float const Bishop::points = 3;
int const Bishop::numDirections = 4;
int const Bishop::directionsOffsets[Bishop::numDirections*2] = {
	-1,-1,
	-1,1,
	1,-1,
	1,1
};

Rook::Rook(square_t square, int id) : DirectionPiece(square, id) {

}

char Rook::getClassSymbol() {
	return Rook::symbol;
}
float Rook::getClassPoints() {
	return Rook::points;
}
int const* const Rook::getDirectionOffsets(int direction) {
	return Rook::directionsOffsets + (2 * direction);
}
int Rook::getNumDirections() {
	return Rook::numDirections;
}

char const Rook::symbol = 'R';
float const Rook::points = 5;
int const Rook::numDirections = 4;
int const Rook::directionsOffsets[Rook::numDirections * 2] = {
	-1,0,
	0,-1,
	0,1,
	1,0
};

Queen::Queen(square_t square, int id) : DirectionPiece(square, id) {

}

char Queen::getClassSymbol() {
	return Queen::symbol;
}
float Queen::getClassPoints() {
	return Queen::points;
}
int const* const Queen::getDirectionOffsets(int direction) {
	return Queen::directionsOffsets + (2 * direction);
}
int Queen::getNumDirections() {
	return Queen::numDirections;
}

char const Queen::symbol = 'Q';
float const Queen::points = 9;
int const Queen::numDirections = 8;
int const Queen::directionsOffsets[Queen::numDirections * 2] = {
	-1,-1,
	-1,0,
	-1,1,
	0,-1,
	0,1,
	1,-1,
	1,0,
	1,1
};