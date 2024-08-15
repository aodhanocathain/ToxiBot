#pragma once

#include "Square.h"

class BoardAgent { 
public:
	static int const DUMMY_ID;
	BoardAgent(Square::square_t square = Square::DUMMY_SQUARE, int id = DUMMY_ID);
	Square::square_t getSquare();
	void setSquare(Square::square_t square);
	int getId();
private:
	Square::square_t square;
	int id;
};