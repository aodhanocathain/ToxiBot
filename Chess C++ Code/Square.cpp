#include <string>
using std::string;
#include "Constants.h"
#include "Square.h"
using Square::square_t;

square_t Square::make(rank_t rank, file_t file)
{
	return (rank * NUM_FILES) + file;
}

bool Square::validRank(rank_t rank)
{
	return (0 <= rank) && (rank < NUM_RANKS);
}
bool Square::validFile(file_t file)
{
	return (0 <= file) && (file < NUM_FILES);
}
bool Square::validRankAndFile(rank_t rank, file_t file)
{
	return Square::validRank(rank) && Square::validFile(file);
}

Square::rank_t Square::rank(square_t s)
{
	return s / NUM_FILES;
}
Square::file_t Square::file(square_t s)
{
	return s % NUM_FILES;
}

Square::file_t const Square::DUMMY_FILE = -1;
Square::rank_t const Square::DUMMY_RANK = -1;
Square::square_t const Square::DUMMY_SQUARE = Square::make(DUMMY_RANK, DUMMY_FILE);

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