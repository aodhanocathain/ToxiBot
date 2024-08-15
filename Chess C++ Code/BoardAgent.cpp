#include "BoardAgent.h"
#include "Square.h"
using Square::square_t;

int const BoardAgent::DUMMY_ID = -1;

BoardAgent::BoardAgent(square_t square, int id) : square(square), id(id)
{}

square_t BoardAgent::getSquare() {
	return this->square;
}

void BoardAgent::setSquare(square_t square) {
	this->square = square;
}

int BoardAgent::getId() {
	return this->id;
}