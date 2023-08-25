#pragma once

#include "Square.h"
#include "constants.h"

Square Square_make(Rank rank, File file)
{
	return (rank*NUM_FILES)+file;
}

int Square_validRank(Rank rank)
{
	return (0<=rank)&&(rank<NUM_RANKS);
}

int Square_validFile(File file)
{
	return (0<=file)&&(file<NUM_FILES);
}

int Square_validRankAndFile(Rank rank, File file)
{
	return Square_validRank(rank) && Square_validFile(file);
}

Rank Square_rank(Square square)
{
	return square/NUM_FILES;
}
File Square_file(Square square)
{
	return square%NUM_FILES;
}

void Square_print(Square square)
{
	char name[] = {MIN_FILE_CHAR + Square_file(square), MIN_RANK_CHAR + Square_rank(square), 0};
	printf("%s", name);
}