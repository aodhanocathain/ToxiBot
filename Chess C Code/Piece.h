#pragma once

enum PIECE_TYPE {KING};
extern const char PIECE_TYPE_CHARS[];

typedef struct {
	enum PIECE_TYPE type;
	unsigned char id;
} Piece;

Piece* Piece_create(enum PIECE_TYPE type, unsigned char id);