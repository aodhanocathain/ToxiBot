#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "Colours.h"

/*
	ANSI colour codes:
	dark text is of the form \033[3_m
	light text is of the form \033[9_m
	dark background is of the form \033[4_m
	light background is of the form \033[10_m
	...where _ is some decimal digit
*/

char* colourf(Colour c, Brightness b, Selection s)
{
	char* format = malloc(sizeof(char) * (strlen(COLOUR_APPLY_STRING_SHAPE) + 1));
	//calculating the right code to print from the details given
	sprintf(format, "\033[%d%dm", (3 + s) + (6 * b), c);
	return format;
}

char* resetf()
{
	char* format = malloc(sizeof(char) * ((2 * strlen(COLOUR_APPLY_STRING_SHAPE)) + 1));
	char* resettext = colourf(RESET_TEXT);
	char* resetbg = colourf(RESET_BACKGROUND);
	sprintf(format, "%s%s", resettext, resetbg);
	free(resettext);
	free(resetbg);
	return format;
}