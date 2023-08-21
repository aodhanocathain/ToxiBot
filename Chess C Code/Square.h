#pragma once

#include "constants.h"

#define MAX_SQUARE (NUM_RANKS*NUM_FILES)

typedef unsigned char Square;
typedef unsigned char Rank;
typedef unsigned char File;

Square Square_make(Rank rank, File file);

int Square_validRank(Rank rank);
int Square_validFile(File file);
int Square_validRankAndFile(Rank rank, File file);

Rank Square_rank(Square square);
File Square_file(Square square);

void Square_print(Square square);