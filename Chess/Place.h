#pragma once

#include <stdio.h>

typedef unsigned char Place;
typedef unsigned char Spec;

#define SPEC_BITS 3 //log2(BOARD_WIDTH)
#define PLACE_SPECS 2 //2 specs identify a place, e.g. e and 4
#define PLACE_BITS (PLACE_SPECS*SPEC_BITS)

#define SPEC_MASK ((1 << SPEC_BITS) - 1)
#define PLACE_MASK ((1 << PLACE_BITS) - 1)

//Using 3 bits for 2 specs, the remaining bits (most significant 2 of 8) should never be set
#define NO_PLACE ((Place)-1)

static inline Place Placify_int(Spec file, Spec rank)
{
	return (file << SPEC_BITS) | rank;
}
static inline Place Placify_char(Spec file, Spec rank)
{
	return Placify_int(file - 'a', rank - '1');
}
static inline Spec Place_file(Place place)
{
	return (place >> SPEC_BITS) & SPEC_MASK;
}
static inline Spec Place_rank(Place place)
{
	return place & SPEC_MASK;
}

void Place_print(Place place);