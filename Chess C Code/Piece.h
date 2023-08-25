#pragma once

extern enum PIECE_TYPE;
extern const char PIECE_TYPE_CHARS[];
extern const int PIECE_TYPE_POINTS[];

typedef struct {
	enum PIECE_TYPE type;
	unsigned char id;
} Piece;

Piece* Piece_create(enum PIECE_TYPE type, unsigned char id);