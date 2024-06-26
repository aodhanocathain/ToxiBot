#include <algorithm>
#include <array>
using std::array;
#include <functional>
using std::function;
#include <memory>
using std::shared_ptr;
#include <stdexcept>
using std::exception;
#include <vector>
using std::vector;

#include "BitVector64.h"
using BitVector64::bitvector64_t;
#include "Move.h"
#include "Piece.h"
#include "SquareSet.h"
using SquareSet::squareset_t;
#include "Team.h"

int Team::getNextId()
{
	return this->nextId;
}
Team* Team::getOpposition() {
	return this->opposition;
}
shared_ptr<King> Team::getKing() {
	return this->king;
}
squareset_t Team::getActivePieceLocations() {
	return this->activePieceLocations;
}

void Team::setActivePieceLocations(SquareSet::squareset_t activePieceLocations) {
	this->activePieceLocations = activePieceLocations;
}

void Team::registerActivePiece(shared_ptr<Piece> piece)
{
	this->activePieces[this->nextId] = piece;
	this->nextId++;
	this->activePieceLocations = SquareSet::add(this->activePieceLocations, piece->getSquare());
	if (piece->getClassSymbol() == King::symbol) {
		this->king = std::static_pointer_cast<King>(piece);
	}
}
void Team::deactivatePiece(std::shared_ptr<Piece> piece) {
	this->activePieces[piece->getId()].reset();
	this->inactivePieces[piece->getId()] = piece;
	this->activePieceLocations = SquareSet::remove(this->getActivePieceLocations(), piece->getSquare());
}
void Team::activatePiece(std::shared_ptr<Piece> piece) {
	this->activePieces[piece->getId()] = piece;
	this->inactivePieces[piece->getId()].reset();
	this->activePieceLocations = SquareSet::add(this->getActivePieceLocations(), piece->getSquare());
}
bool Team::has(shared_ptr<Piece> piece) {
	return std::find(this->activePieces.cbegin(), this->activePieces.cend(), piece) != this->activePieces.cend();
}

float Team::calculatePoints() {
	float points = 0;
	for (array<shared_ptr<Piece>, NUM_SQUARES>::iterator piece = this->activePieces.begin(); piece != this->activePieces.end(); piece++) {
		if (*piece) {
			points += (*piece)->getClassPoints();
		}
	}
	return points;
}

squareset_t Team::calculateAttackSet() {
	squareset_t set = SquareSet::emptySet();
	squareset_t* accumulator = &set;
	std::for_each(this->activePieces.cbegin(), this->activePieces.cend(), [this, accumulator](shared_ptr<Piece> piece) {
		if (piece) {
			*accumulator = SquareSet::unify(*accumulator, piece->calculateAttackSet(this->getActivePieceLocations(), this->opposition->getActivePieceLocations()));
		}
		});
	return set;
}
vector<vector<Move*>> Team::calculateConsideredMoves() {
	vector<vector<Move*>> consideredMoves;
	squareset_t oppositionActivePieceLocations = this->opposition->getActivePieceLocations();
	for (array<shared_ptr<Piece>, NUM_SQUARES>::const_iterator pieceItr = this->activePieces.cbegin(); pieceItr != this->activePieces.cend(); pieceItr++) {
		if ((*pieceItr)) {
			consideredMoves.push_back((*pieceItr)->calculateConsideredMoves(this->activePieceLocations, oppositionActivePieceLocations));
		}
	}
	return consideredMoves;
}

Team::Team(Team* opposition)
{
	this->opposition = opposition;
	this->nextId = 0;
	this->activePieceLocations = SquareSet::emptySet();
}

WhiteTeam::WhiteTeam(Team* opposition) : Team(opposition) {

}
char WhiteTeam::getClassSymbol() {
	return WhiteTeam::symbol;
}
char WhiteTeam::convert(char teamedChar){
	return toupper(teamedChar);
}
bool WhiteTeam::prefers(float preferred, float to) {
	return preferred > to;
}
int WhiteTeam::getClassPawnStartRank() {
	return 1;
}
int WhiteTeam::getClassPawnIncrement() {
	return 1;
}
float WhiteTeam::getWorstScore() {
	return -INFINITY;
}

char const WhiteTeam::symbol = 'w';

BlackTeam::BlackTeam(Team* opposition) : Team(opposition) {

}
char BlackTeam::getClassSymbol() {
	return BlackTeam::symbol;
}
char BlackTeam::convert(char teamedChar) {
	return tolower(teamedChar);
}
bool BlackTeam::prefers(float preferred, float to) {
	return preferred < to;
}
int BlackTeam::getClassPawnStartRank() {
	return NUM_RANKS - 2;
}
int BlackTeam::getClassPawnIncrement() {
	return -1;
}
float BlackTeam::getWorstScore() {
	return INFINITY;
}

char const BlackTeam::symbol = 'b';