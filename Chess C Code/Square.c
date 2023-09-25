#pragma once

#include "Square.h"
#include "constants.h"

Square Square_create(int rank, int file)
{
	return (rank*NUM_FILES)+file;
}

int Square_validRank(int rank)
{
	return (0<=rank)&&(rank<NUM_RANKS);
}

int Square_validFile(int file)
{
	return (0<=file)&&(file<NUM_FILES);
}

int Square_validRankAndFile(int rank, int file)
{
	return Square_validRank(rank) && Square_validFile(file);
}

int Square_rank(Square square)
{
	return square/NUM_FILES;
}
int Square_file(Square square)
{
	return square%NUM_FILES;
}

int Square_equal(Square s1, Square s2)
{
	return s1==s2;
}

void Square_print(Square square)
{
	char name[] = {MIN_FILE_CHAR + Square_file(square), MIN_RANK_CHAR + Square_rank(square), 0};
	printf("%s", name);
}