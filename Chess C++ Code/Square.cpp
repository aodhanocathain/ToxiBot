#include <string>
using std::string;
#include "Constants.h"
#include "Square.h"
using Square::square_t;

square_t Square::make(int rank, int file)
{
	return (rank * NUM_FILES) + file;
}

bool Square::validRank(int rank)
{
	return (0 <= rank) && (rank < NUM_RANKS);
}
bool Square::validFile(int file)
{
	return (0 <= file) && (file < NUM_FILES);
}
bool Square::validRankAndFile(int rank, int file)
{
	return Square::validRank(rank) && Square::validFile(file);
}

int Square::rank(square_t s)
{
	return s / NUM_FILES;
}
int Square::file(square_t s)
{
	return s % NUM_FILES;
}

int const Square::DUMMY_FILE = -1;

string Square::fileString(square_t s)
{
	return string(1, MIN_FILE_CHAR + Square::file(s));
}
string Square::rankString(square_t s)
{
	return string(1, MIN_RANK_CHAR + Square::rank(s));
}
string Square::fullString(square_t s)
{
	return Square::fileString(s) + Square::rankString(s);
}