#pragma once

//These enums are ordered for calculating numbers used for ANSI colour codes
typedef enum { BLACK_COLOUR, RED_COLOUR, GREEN_COLOUR, YELLOW_COLOUR, BLUE_COLOUR, MAGENTA_COLOUR, CYAN_COLOUR, WHITE_COLOUR } Colour;
typedef enum { DARK, LIGHT } Brightness;
typedef enum { TEXT, BACKGROUND } Selection;

#define RESET_TEXT WHITE_COLOUR,LIGHT,TEXT
#define RESET_BACKGROUND BLACK_COLOUR,DARK,BACKGROUND

#define BOARD_DARK_BACKGROUND YELLOW_COLOUR,LIGHT,BACKGROUND
#define BOARD_LIGHT_BACKGROUND WHITE_COLOUR,LIGHT,BACKGROUND
#define GRID_TEXT MAGENTA_COLOUR,LIGHT,TEXT

#define WHITE_TEAM_TEXT GREEN_COLOUR,DARK,TEXT
#define BLACK_TEAM_TEXT RED_COLOUR,DARK,TEXT

void colour(Colour c, Brightness b, Selection s);
void reset_colours();	//resets text colour AND background colour