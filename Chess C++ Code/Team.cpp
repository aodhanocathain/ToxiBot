#include <algorithm>
#include <array>
using std::array;
#include <functional>
using std::function;
#include <memory>
using std::shared_ptr;
#include <stdexcept>
using std::exception;

#include "BitVector64.h"
using BitVector64::bitvector64_t;
#include "Piece.h"
#include "SquareSet.h"
using SquareSet::squareset_t;
#include "Team.h"

char Team::getSymbol() {
	throw exception("a subclass of Team did not implement getSymbol");
}

int Team::getNextId()
{
	return this->nextId;
}

void Team::registerActivePiece(shared_ptr<Piece> piece)
{
	this->activePieces[this->nextId] = piece;
	this->nextId++;
	this->activePieceLocations = SquareSet::add(this->activePieceLocations, piece->getSquare());
}

bool Team::has(shared_ptr<Piece> piece) {
	return std::find(this->activePieces.cbegin(), this->activePieces.cend(), piece) != this->activePieces.cend();
}

Team::Team()
{
	this->nextId = 0;
	this->activePieceLocations = SquareSet::emptySet();
	this->idsSeeingOpposingKing = BitVector64::zeroes();
}

WhiteTeam::WhiteTeam() : Team() {

}

char WhiteTeam::getSymbol() {
	return 'w';
}

char WhiteTeam::convert(char teamedChar){
	return toupper(teamedChar);
}

BlackTeam::BlackTeam() : Team() {

}

char BlackTeam::getSymbol() {
	return 'b';
}

char BlackTeam::convert(char teamedChar) {
	return tolower(teamedChar);
}