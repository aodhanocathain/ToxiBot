#pragma once

#include "BitVector64.h"
#include "BoardAgent.h"
#include "Constants.h"
#include "Move.h"
#include "Piece.h"
#include "SquareSet.h"
#include "StackContainer.h"

#define NUM_PIECES NUM_SQUARES

class Team {
public:
	//NONE greater than all valid types for bounds checking when iterating through types
	enum type_t {WHITE=0, BLACK=1, NONE=2};

	static char const symbols[];
	static float const worstScores[];
	static Square::rank_t const pawnStartRanks[];
	static int const pawnRankIncrements[];
	static char(*charConverters[])(char teamedChar);
	static bool(*scorePreferers[])(float prefers, float to);
	static float const scoreMultipliers[];

	static type_t getTypeOfTeamSymbol(char symbol);
	static type_t getTypeOfPieceSymbol(char symbol);

	char getSymbol();
	type_t getType();
	bool prefers(float score, float to);
	float getWorstScore();
	float getScoreMultiplier();
	int getNextId();
	Team* getOpposition();
	Piece* getKing();
	Piece* getPiece(int id);
	SquareSet::squareset_t getActivePieceLocations();

	char convert(char pieceSymbol);
	void setActivePieceLocations(SquareSet::squareset_t activePieceLocations);

	void createAndRegisterActivePiece(Piece::type_t type, Square::square_t square, int id);
	void deactivatePiece(int id);
	void activatePiece(int id);
	bool has(int id);

	float getCombinedPieceValues();
	SquareSet::squareset_t calculateAttackSet();

	Team(Team::type_t type, Team* opposition);

private:
	Team* const opposition;
	Piece* king;
	StackContainer<Piece, NUM_PIECES> pieces;
	BitVector64::bitvector64_t activeIds;
	SquareSet::squareset_t activePieceLocations;

	type_t type;
	int const pawnRankIncrement;
	char (*charConverter)(char teamedChar);
	bool (*scorePreferred)(float prefers, float to);
	float const scoreMultiplier;
	float combinedPieceValues;
	float const worstScore;
	char const symbol;
	Square::rank_t const pawnStartRank;
};