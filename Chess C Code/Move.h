#pragma once

#include "Square.h"

typedef short int Move;

Move Move_make(Square mainBefore, Square mainAfter);

Square Move_mainBefore(Move move);
Square Move_mainAfter(Move move);

void Move_print(Move move);