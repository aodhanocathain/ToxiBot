#include "BitVector64.h"
using BitVector64::bitvector64_t;
#include "Move.h"
#include "Piece.h"
#include "Square.h"
using Square::square_t;
using Square::rank_t;
using Square::file_t;
#include "SquareSet.h"
using SquareSet::squareset_t;
#include "StackContainer.h"
#include "Team.h"

namespace White {
	char charConverter(char teamedChar) {
		return toupper(teamedChar);
	}
	bool scorePreferred(float prefers, float to) {
		return prefers > to;
	}
}

namespace Black {
	char charConverter(char teamedChar) {
		return tolower(teamedChar);
	}
	bool scorePreferred(float prefers, float to) {
		return prefers < to;
	}
}

char const Team::symbols[] = {'w','b'};
float const Team::worstScores[] = {-1000, 1000};
rank_t const Team::pawnStartRanks[] = {1, NUM_RANKS-2};
int const Team::pawnRankIncrements[] = {1, -1};
char(* Team::charConverters[])(char teamedChar) = {White::charConverter, Black::charConverter};
bool(* Team::scorePreferers[])(float prefers, float to) = {White::scorePreferred, Black::scorePreferred};
float const Team::scoreMultipliers[] = {1.0f, -1.0f};

Team::type_t Team::getTypeOfTeamSymbol(char symbol) {
	for (int i = 0; i < Team::NONE; i++) {
		if (Team::symbols[i] == symbol) {
			return (type_t)i;
		}
	}
	return NONE;
}

Team::type_t Team::getTypeOfPieceSymbol(char symbol) {
	for (int i = 0; i < Team::NONE; i++) {
		if (Team::charConverters[i](symbol) == symbol) {
			return (type_t)i;
		}
	}
	return NONE;
}

char Team::getSymbol() {
	return this->symbol;
}

Team::type_t Team::getType() {
	return this->type;
}

bool Team::prefers(float score, float to) {
	return this->scorePreferred(score, to);
}

float Team::getWorstScore() {
	return this->worstScore;

}

float Team::getScoreMultiplier() {
	return this->scoreMultiplier;
}

int Team::getNextId()
{
	return this->pieces.getNextFreeIndex();
}
Team* Team::getOpposition() {
	return this->opposition;
}
Piece* Team::getKing() {
	return this->king;
}

Piece* Team::getPiece(int id) {
	return &(this->pieces[id]);
}

squareset_t Team::getActivePieceLocations() {
	return this->activePieceLocations;
}

char Team::convert(char pieceSymbol) {
	return this->charConverter(pieceSymbol);
}

void Team::setActivePieceLocations(SquareSet::squareset_t activePieceLocations) {
	this->activePieceLocations = activePieceLocations;
}

void Team::createAndRegisterActivePiece(Piece::type_t type, Square::square_t square, int id) {
	squareset_t(*attackSetCalculator)(square_t, squareset_t, squareset_t);
	if (type == Piece::PAWN) {
		attackSetCalculator = (this->getType() == Team::WHITE) ? Pawn::calculateAttackSet_positiveIncrement : Pawn::calculateAttackSet_negativeIncrement;
	}
	else {
		attackSetCalculator = Piece::attackSetCalculators[type];
	}
	this->pieces.push(Piece(type, square, id, attackSetCalculator));
	this->activatePiece(id);
	if (type == Piece::KING) {
		this->king = this->getPiece(id);
	}
}
void Team::deactivatePiece(int id) {
	Piece* p = this->getPiece(id);
	this->activePieceLocations = SquareSet::remove(this->getActivePieceLocations(), p->getSquare());
	this->activeIds = BitVector64::clear(this->activeIds, id);
	this->combinedPieceValues -= p->getPointsValue();
}

void Team::activatePiece(int id) {
	Piece* p = this->getPiece(id);
	this->activePieceLocations = SquareSet::add(this->getActivePieceLocations(), p->getSquare());
	this->activeIds = BitVector64::set(this->activeIds, id);
	this->combinedPieceValues += p->getPointsValue();
}
bool Team::has(int id) {
	return BitVector64::read(this->activeIds, id)!=0;
}

float Team::getCombinedPieceValues() {
	return this->combinedPieceValues;
}

squareset_t Team::calculateAttackSet() {
	squareset_t set = SquareSet::emptySet();
	int indices = this->pieces.getNextFreeIndex();
	squareset_t friendlies = this->getActivePieceLocations();
	squareset_t enemies = this->getOpposition()->getActivePieceLocations();
	for (int id = 0; id < indices; id++) {
		if (this->has(id)) {
			set = SquareSet::unify(set, this->getPiece(id)->calculateAttackSet(friendlies, enemies));
		}
	}
	return set;
}

Team::Team(Team::type_t type, Team* opposition) :
	opposition(opposition),
	type(type), symbol(symbols[type]), worstScore(worstScores[type]),
	pawnStartRank(pawnStartRanks[type]), pawnRankIncrement(pawnRankIncrements[type]),
	charConverter(charConverters[type]), scorePreferred(scorePreferers[type]),
	scoreMultiplier(scoreMultipliers[type]), king(nullptr),
	activeIds(BitVector64::zeroes()), activePieceLocations(SquareSet::emptySet()),
	combinedPieceValues(0)
{
}