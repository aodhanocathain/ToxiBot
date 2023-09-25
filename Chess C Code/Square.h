#pragma once

#include "constants.h"

typedef int Square;

#define DUMMY_SQUARE -1

Square Square_create(int rank, int file);

int Square_validRank(int rank);
int Square_validFile(int file);
int Square_validRankAndFile(int rank, int file);

int Square_rank(Square square);
int Square_file(Square square);

int Square_equal(Square s1, Square s2);

void Square_print(Square square);