#include <stdio.h>

#include "Place.h"

void Place_print(Place place)
{
	printf("%c%c", 'a' + Place_file(place), '1' + Place_rank(place));
}