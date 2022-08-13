#include <stdio.h>

#include "Colours.h"

void colour(Colour c, Brightness b, Selection s)
{
	/*
	ANSI colour codes:
	dark text is of the form \033[3_m
	light text is of the form \033[9_m
	dark background is of the form \033[4_m
	light background is of the form \033[10_m
	...where _ is some decimal digit
	*/
	printf("\033[%d%dm", (3 + s) + (6 * b), c);
	//calculating the right code to print from the details given
}

void reset_colours()
{
	colour(RESET_TEXT);
	colour(RESET_BACKGROUND);
}