#pragma once

#include "BoardAgent.h"
#include "Square.h"
#include "SquareSet.h"

struct Piece final : BoardAgent {
public:
	//NONE greater than all valid types for bounds checking when iterating through types
	enum type_t {KING=0, QUEEN=1, ROOK=2, BISHOP=3, KNIGHT=4, PAWN=5, NONE=6};
	static char const symbols[];
	static float const pointsValues[];
	static SquareSet::squareset_t(*const attackSetCalculators[])(Square::square_t square, SquareSet::squareset_t sameTeamAlivePieceLocations, SquareSet::squareset_t opposingTeamAlivePieceLocations);

	static char getPlainSymbolFromTeamedSymbol(char teamedSymbol);
	static type_t getTypeOfPlainSymbol(char plainSymbol);

	Piece(type_t type=NONE, Square::square_t square=Square::DUMMY_SQUARE, int id=BoardAgent::DUMMY_ID, SquareSet::squareset_t(*attackSetCalculator)(Square::square_t square, SquareSet::squareset_t sameTeamAlivePieceLocations, SquareSet::squareset_t opposingTeamAlivePieceLocations)=nullptr);

	type_t getType();
	char getSymbol();
	float getPointsValue();
	SquareSet::squareset_t calculateAttackSet(SquareSet::squareset_t sameTeamPieceLocations, SquareSet::squareset_t opposingTeamPieceLocations);
private:
	type_t type;
	float pointsValue;
	SquareSet::squareset_t(*attackSetCalculator)(Square::square_t square, SquareSet::squareset_t sameTeamAlivePieceLocations, SquareSet::squareset_t opposingTeamAlivePieceLocations);
	char symbol;
};

namespace Pawn {
	extern SquareSet::squareset_t calculateAttackSet(Square::square_t square, SquareSet::squareset_t sameTeamAlivePieceLocations, SquareSet::squareset_t opposingTeamAlivePieceLocations, int rankIncrement);
	extern SquareSet::squareset_t calculateAttackSet_positiveIncrement(Square::square_t square, SquareSet::squareset_t sameTeamAlivePieceLocations, SquareSet::squareset_t opposingTeamAlivePieceLocations);
	extern SquareSet::squareset_t calculateAttackSet_negativeIncrement(Square::square_t square, SquareSet::squareset_t sameTeamAlivePieceLocations, SquareSet::squareset_t opposingTeamAlivePieceLocations);
}