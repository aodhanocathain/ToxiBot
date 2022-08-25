#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "Place.h"
#include "Mask.h"

Place Placify_int(Place_Spec file, Place_Spec rank)
{
	return (file << PLACE_SPEC_BITS) | rank;
}
Place Placify_char(Place_Spec file, Place_Spec rank)
{
	return Placify_int(file - 'a', rank - '1');
}
Place_Spec Place_file(Place place)
{
	return (place >> PLACE_SPEC_BITS) & Mask(PLACE_SPEC_BITS);
}
Place_Spec Place_rank(Place place)
{
	return place & Mask(PLACE_SPEC_BITS);
}

char* Place_format(Place place)
{
	char* format = malloc(sizeof(char)*(strlen(PLACE_STRING_SHAPE) + 1));	//+1 for a null terminator
	sprintf(format, "%c%c", Place_file(place) + 'a', Place_rank(place) + '1');
	return format;
}