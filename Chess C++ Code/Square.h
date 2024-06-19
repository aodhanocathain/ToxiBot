#pragma once

#include <string>

namespace Square {
	typedef int square_t;

	square_t ofRankAndFile(int rank, int file);

	bool validRank(int rank);
	bool validFile(int file);
	bool validRankAndFile(int rank, int file);

	int rank(square_t s);
	int file(square_t s);

	std::string rankString(square_t s);
	std::string fileString(square_t s);
	std::string fullString(square_t s);
}