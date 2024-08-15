#pragma once

#include <string>

namespace Square {
	typedef unsigned char square_t;
	typedef unsigned char rank_t;
	typedef unsigned char file_t;

	square_t make(rank_t rank, file_t file);

	bool validRank(rank_t rank);
	bool validFile(file_t file);
	bool validRankAndFile(rank_t rank, file_t file);

	rank_t rank(square_t s);
	file_t file(square_t s);

	extern file_t const DUMMY_FILE;
	extern rank_t const DUMMY_RANK;
	extern square_t const DUMMY_SQUARE;

	std::string rankString(square_t s);
	std::string fileString(square_t s);
	std::string fullString(square_t s);
}