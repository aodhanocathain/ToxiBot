#pragma once

#include "constants.h"

typedef unsigned char Square;

Square Square_make(int rank, int file);

int Square_validRank(int rank);
int Square_validFile(int file);
int Square_validRankAndFile(int rank, int file);

int Square_rank(Square square);
int Square_file(Square square);

void Square_print(Square square);