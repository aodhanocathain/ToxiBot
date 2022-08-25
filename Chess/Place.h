#pragma once

//Using 3 bits for 2 specs, the remaining bits (most significant 2 of 8) should never be set
#define NO_PLACE ((Place)-1)

#define PLACE_SPEC_BITS 3 //((int)(ceil(log2(BOARD_WIDTH))))
#define PLACE_SPECS 2 //BOARD_DIMENSIONS
#define PLACE_BITS (PLACE_SPECS*PLACE_SPEC_BITS)

//A place is what I call a square on the board described by a file and a rank, e.g. f7
//A spec is any 1 of the parts of the place, either its file or its rank e.g. f
typedef unsigned char Place;
typedef unsigned char Place_Spec;

Place Placify_int(Place_Spec file, Place_Spec rank);
Place Placify_char(Place_Spec file, Place_Spec rank);
Place_Spec Place_file(Place place);
Place_Spec Place_rank(Place place);

#define PLACE_STRING_SHAPE "fr"
char* Place_format(Place place);