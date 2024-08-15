#include "Piece.h"
#include "Square.h"
using Square::square_t;
using Square::rank_t;
using Square::file_t;
#include "SquareSet.h"
using SquareSet::squareset_t;

char Piece::getPlainSymbolFromTeamedSymbol(char teamedSymbol) {
	return toupper(teamedSymbol);
}

Piece::type_t Piece::getTypeOfPlainSymbol(char plainSymbol) {
	for (int i = 0; i < Piece::NONE; i++) {
		if (Piece::symbols[i] == plainSymbol) {
			return (type_t)i;
		}
	}
	return NONE;
}

const char Piece::symbols[] = { 'K', 'Q', 'R', 'B', 'N', 'P', '?'};
const float Piece::pointsValues[] = {0.0f, 9.0f, 5.0f, 3.0f, 3.0f, 1.0f, NAN};

squareset_t calculateAttackSet_fixedOffsetPairs(square_t square, squareset_t friendlies, squareset_t opposition, int numOffsetPairs, int* offsetPairs) {
	squareset_t attackSet = SquareSet::emptySet();

	rank_t rank = Square::rank(square);
	file_t file = Square::file(square);

	int numPairs = numOffsetPairs;
	for (int pair = 0; pair < numPairs; pair++)
	{
		int const* offsetPair = offsetPairs + (pair * 2);
		int rankOffset = offsetPair[0];
		int fileOffset = offsetPair[1];
		rank_t attackedRank = rank + rankOffset;
		file_t attackedFile = file + fileOffset;
		if (Square::validRankAndFile(attackedRank, attackedFile))
		{
			square_t attackedSquare = Square::make(attackedRank, attackedFile);
			attackSet = SquareSet::add(attackSet, attackedSquare);
		}
	}
	return SquareSet::differ(attackSet, friendlies);
}

namespace King {
	int numOffsetPairs = 8;
	int offsetPairs[] = {
		-1, -1,
		-1, 0,
		-1, 1,
		0, -1,
		0, 1,
		1, -1,
		1, 0,
		1, 1
	};
	squareset_t calculateAttackSet(square_t square, squareset_t sameTeamAlivePieceLocations, squareset_t opposingTeamAlivePieceLocations) {
		return calculateAttackSet_fixedOffsetPairs(square, sameTeamAlivePieceLocations, opposingTeamAlivePieceLocations, numOffsetPairs, offsetPairs);
	}
}

namespace Knight {
	int numOffsetPairs = 8;
	int offsetPairs[] = {
		-2, -1,
		-2, 1,
		-1, -2,
		-1, 2,
		1, -2,
		1, 2,
		2, -1,
		2, 1
	};
	squareset_t calculateAttackSet(square_t square, squareset_t sameTeamAlivePieceLocations, squareset_t opposingTeamAlivePieceLocations) {
		return calculateAttackSet_fixedOffsetPairs(square, sameTeamAlivePieceLocations, opposingTeamAlivePieceLocations, numOffsetPairs, offsetPairs);
	}
}

squareset_t calculateAttackSet_directionOffsetPairs(square_t square, squareset_t friendlies, squareset_t opposition, int numDirections, int* offsetPairs) {
	squareset_t attackSet = SquareSet::emptySet();
	squareset_t obstacles = SquareSet::unify(friendlies, opposition);

	rank_t rank = Square::rank(square);
	file_t file = Square::file(square);

	for (int direction = 0; direction < numDirections; direction++)
	{
		int const* offsetPair = offsetPairs + (2 * direction);
		int rankOffset = offsetPair[0];
		int fileOffset = offsetPair[1];

		rank_t newRank = rank + rankOffset;
		file_t newFile = file + fileOffset;

		bool blocked = false;
		bool valid = Square::validRankAndFile(newRank, newFile);
		while (valid && !blocked) {
			square_t newSquare = Square::make(newRank, newFile);
			attackSet = SquareSet::add(attackSet, newSquare);

			blocked = SquareSet::has(obstacles, newSquare);

			newRank += rankOffset;
			newFile += fileOffset;

			valid = Square::validRankAndFile(newRank, newFile);
		}
	}
	return SquareSet::differ(attackSet, friendlies);;
}

namespace Queen {
	int numOffsetPairs = 8;
	int offsetPairs[] = {
		-1,-1,
		-1,0,
		-1,1,
		0,-1,
		0,1,
		1,-1,
		1,0,
		1,1
	};
	squareset_t calculateAttackSet(square_t square, squareset_t sameTeamAlivePieceLocations, squareset_t opposingTeamAlivePieceLocations) {
		return calculateAttackSet_directionOffsetPairs(square, sameTeamAlivePieceLocations, opposingTeamAlivePieceLocations, numOffsetPairs, offsetPairs);
	}
}

namespace Rook {
	int numOffsetPairs = 4;
	int offsetPairs[] = {
		-1,0,
		0,-1,
		0,1,
		1,0
	};
	squareset_t calculateAttackSet(square_t square, squareset_t sameTeamAlivePieceLocations, squareset_t opposingTeamAlivePieceLocations) {
		return calculateAttackSet_directionOffsetPairs(square, sameTeamAlivePieceLocations, opposingTeamAlivePieceLocations, numOffsetPairs, offsetPairs);
	}
}

namespace Bishop {
	int numOffsetPairs = 4;
	int offsetPairs[] = {
		-1,-1,
		-1,1,
		1,-1,
		1,1
	};
	squareset_t calculateAttackSet(square_t square, squareset_t sameTeamAlivePieceLocations, squareset_t opposingTeamAlivePieceLocations) {
		return calculateAttackSet_directionOffsetPairs(square, sameTeamAlivePieceLocations, opposingTeamAlivePieceLocations, numOffsetPairs, offsetPairs);
	}
}

namespace Pawn {
	squareset_t calculateAttackSet(square_t square, squareset_t sameTeamAlivePieceLocations, squareset_t opposingTeamAlivePieceLocations, int rankIncrement) {
		squareset_t attackset = SquareSet::emptySet();
		rank_t rank = Square::rank(square);
		rank_t nextRank = rank + rankIncrement;
		file_t file = Square::file(square);
		file_t leftFile = file - 1;
		file_t rightFile = file + 1;
		square_t leftCaptureSquare = Square::make(nextRank, leftFile);
		square_t rightCaptureSquare = Square::make(nextRank, rightFile);
		if (Square::validRankAndFile(nextRank, leftFile) && SquareSet::has(opposingTeamAlivePieceLocations, leftCaptureSquare)) {
			attackset = SquareSet::add(attackset, leftCaptureSquare);
		}
		if (Square::validRankAndFile(nextRank, rightFile) && SquareSet::has(opposingTeamAlivePieceLocations, rightCaptureSquare)) {
			attackset = SquareSet::add(attackset, rightCaptureSquare);
		}
		return SquareSet::differ(attackset, sameTeamAlivePieceLocations);
	}

	squareset_t calculateAttackSet_positiveIncrement(square_t square, squareset_t sameTeamAlivePieceLocations, squareset_t opposingTeamAlivePieceLocations) 
	{
		return calculateAttackSet(square, sameTeamAlivePieceLocations, opposingTeamAlivePieceLocations, +1);
	}

	squareset_t calculateAttackSet_negativeIncrement(square_t square, squareset_t sameTeamAlivePieceLocations, squareset_t opposingTeamAlivePieceLocations)
	{
		return calculateAttackSet(square, sameTeamAlivePieceLocations, opposingTeamAlivePieceLocations, -1);
	}
}

squareset_t(*const Piece::attackSetCalculators[])(square_t square, squareset_t sameTeamAlivePieceLocations, squareset_t opposingTeamAlivePieceLocations) = {
	King::calculateAttackSet,
	Queen::calculateAttackSet,
	Rook::calculateAttackSet,
	Bishop::calculateAttackSet,
	Knight::calculateAttackSet,
};

squareset_t Piece::calculateAttackSet(squareset_t sameTeamAlivePieceLocations, squareset_t opposingTeamAlivePieceLocations) {
	return this->attackSetCalculator(this->getSquare(), sameTeamAlivePieceLocations, opposingTeamAlivePieceLocations);
}

Piece::Piece(type_t type, square_t square, int id, squareset_t(*attackSetCalculator)(square_t square, squareset_t sameTeamAlivePieceLocations, squareset_t opposingTeamAlivePieceLocations)) :
	BoardAgent(square, id), type(type), symbol(Piece::symbols[type]), attackSetCalculator(attackSetCalculator), pointsValue(Piece::pointsValues[type])
{}

Piece::type_t Piece::getType() {
	return this->type;
}

char Piece::getSymbol() {
	return this->symbol;
}

float Piece::getPointsValue() {
	return this->pointsValue;
}