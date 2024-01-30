const {NUM_FILES, NUM_RANKS, MAX_EVALUATION_SCORE, MAX_EVALUATION_DEPTH} = require("./Constants.js");
const {Manager} = require("./Manager.js");
const {Square} = require("./Square.js");
const {King, Queen, Rook, WINGS} = require("./Piece.js");
const {BitVector64} = require("./BitVector64.js");

class Team
{
	static char;
	static name;
	static MOVE_COLOUR;
	static BACK_RANK;
	
	static PAWN_START_RANK;
	static PAWN_RANK_INCREMENT;
	
	static SCORE_MULTIPLIER;
	
	//assigned manually near the end of this file, after team class declarations
	static STARTING_KING_SQUARE;
	static STARTING_ROOK_SQUARES_BY_WING;
	static CASTLE_KING_SQUARES_BY_WING;
	static CASTLE_ROOK_SQUARES_BY_WING;
	
	static CASTLE_INTERMEDIATE_SQUARES_BITVECTOR_BY_WING;
	static CASTLE_REQUIRED_SAFE_SQUARES_BITVECTOR_BY_WING;
	
	static BEST_POSSIBLE_SCORE;
	static INF_SCORE;
	
	static charConverter(char)
	{
		throw "charConverter called but not implemented";
	}
	static classOfTeamedChar(teamedChar)
	{
		return TEAM_CLASSES.find((teamClass)=>{return teamClass.charConverter(teamedChar)==teamedChar;});
	}
	
	game;
	
	activePieces;
	inactivePieces;	
	nextId;
	
	activePieceLocationsBitVector;
	
	points;
	numEnemyKingSeers;
	
	idsSeeingEnemyCastleSafeSquaresBitVectorByWing;
	
	king;
	rooksInStartSquaresByWing;
	
	//assigned by the team's game
	opposition;
	
	constructor(game)
	{
		this.game = game;
		
		this.activePieces = [];
		this.inactivePieces = [];
		this.nextId = 0;
		
		this.activePieceLocationsBitVector = new BitVector64();
		
		this.idsSeeingEnemyCastleSafeSquaresBitVectorByWing = WINGS.reduce((accumulator, wing)=>{
			accumulator[wing] = new BitVector64();
			return accumulator;
		}, {});
		
		this.points = 0;
		this.numEnemyKingSeers = 0;
		
		this.rooksInStartSquaresByWing = {};
	}
	
	addActivePiece(piece)
	{
		this.registerPiece(piece);
		this.activatePiece(piece);
	}
	
	//called only at the start of a game
	registerPiece(piece)
	{
		piece.id = this.nextId++;
		piece.team = this;
		
		if(piece instanceof King)
		{
			this.king = piece;
			if(piece.square==this.constructor.STARTING_KING_SQUARE)
			{
				//assume the king did not move yet
				piece.canCastle = new Manager(true);
				//the game castling rights are used to verify this anyway
			}
			else
			{
				piece.canCastle = new Manager(false);
			}
		}
		else if(piece instanceof Rook)
		{
			const wing = WINGS.find((wing)=>{
				return piece.square==this.constructor.STARTING_ROOK_SQUARES_BY_WING[wing];
			});
			this.rooksInStartSquaresByWing[wing] = piece;
			piece.canCastle = new Manager(!!wing);
		}
	}
	
	activatePiece(piece)
	{
		this.activePieces[piece.id] = piece;
		delete this.inactivePieces[piece.id];
		this.activePieceLocationsBitVector.set(piece.square);
		this.points += piece.constructor.points;
		this.numEnemyKingSeers += piece.seesEnemyKing.get();
	}
	
	deactivatePiece(piece)
	{
		this.inactivePieces[piece.id] = piece;
		delete this.activePieces[piece.id];
		this.activePieceLocationsBitVector.clear(piece.square);
		this.points -= piece.constructor.points;
		this.numEnemyKingSeers -= piece.seesEnemyKing.get();
	}
	
	updatePiece(piece)
	{
		const oldKingSight = piece.seesEnemyKing.get();
		piece.updateAllProperties();
		WINGS.forEach((wing)=>{
			const seenSquares = piece.squaresAttackedBitVector.get().clone();
			seenSquares.and(this.opposition.constructor.CASTLE_REQUIRED_SAFE_SQUARES_BITVECTOR_BY_WING[wing]);
			const seesSquare = !(seenSquares.isEmpty());
			this.idsSeeingEnemyCastleSafeSquaresBitVectorByWing[wing].write(seesSquare, piece.id);
		});
		const newKingSight = piece.seesEnemyKing.get();
		this.numEnemyKingSeers += newKingSight - oldKingSight;
	}
	
	revertPiece(piece)
	{
		const oldKingSight = piece.seesEnemyKing.get();
		piece.revertAllProperties();
		WINGS.forEach((wing)=>{
			const seenSquares = piece.squaresAttackedBitVector.get().clone();
			seenSquares.and(this.opposition.constructor.CASTLE_REQUIRED_SAFE_SQUARES_BITVECTOR_BY_WING[wing]);
			const seesSquare = !(seenSquares.isEmpty());
			this.idsSeeingEnemyCastleSafeSquaresBitVectorByWing[wing].write(seesSquare, piece.id);
		});
		const newKingSight = piece.seesEnemyKing.get();
		this.numEnemyKingSeers += newKingSight - oldKingSight;
		
	}
	
	swapOldPieceForNewPiece(oldPiece, newPiece)
	{
		newPiece.id = oldPiece.id;
		
		this.deactivatePiece(oldPiece);
		this.activatePiece(newPiece);
	}
	
	init()
	{
		this.activePieces.forEach((piece)=>{
			this.updatePiece(piece);
		});
	}
	
	scorePreferredToScore(newScore, oldScore)
	{
		throw "scorePreferredToScore called but not implemented";
	}
	
	evalPreferredToEval(newEval, oldEval)
	{
		return this.scorePreferredToScore(newEval.score, oldEval.score);
	}
}

const WhiteTeam = class extends Team
{
	static char = "w";
	static name = "white";
	static MOVE_COLOUR = "#ffff80";
	static BACK_RANK = 0;
	
	static PAWN_START_RANK = this.BACK_RANK+1;
	static PAWN_RANK_INCREMENT = 1;
	
	static SCORE_MULTIPLIER = 1;
	
	static charConverter(char)
	{
		return char.toUpperCase();
	}
	
	scorePreferredToScore(newScore, oldScore)
	{
		return (newScore > oldScore);
	}
};

const BlackTeam = class extends Team
{
	static char = "b";
	static name = "black";
	static MOVE_COLOUR = "#80ffff";
	static BACK_RANK = NUM_RANKS-1;
	
	static PAWN_START_RANK = this.BACK_RANK-1;
	static PAWN_RANK_INCREMENT = -1;
	
	static SCORE_MULTIPLIER = -1;
	
	static charConverter(char)
	{
		return char.toLowerCase();
	}
	
	scorePreferredToScore(newScore, oldScore)
	{
		return (newScore < oldScore);
	}
}

const TEAM_CLASSES = [WhiteTeam, BlackTeam];

TEAM_CLASSES.forEach((teamClass)=>{
	//king starts on the e-file
	teamClass.STARTING_KING_SQUARE = Square.withRankAndFile(teamClass.BACK_RANK, 4);
	teamClass.STARTING_ROOK_SQUARES_BY_WING = {
		//king rook starts on the h-file
		[King.typeChar]: Square.withRankAndFile(teamClass.BACK_RANK, NUM_FILES-1),
		//queen rook starts on the a-file
		[Queen.typeChar]: Square.withRankAndFile(teamClass.BACK_RANK, 0)
	};
	
	//king goes 2 spaces towards the edge
	teamClass.CASTLE_KING_SQUARES_BY_WING = {
		[King.typeChar]: Square.withRankAndFile(teamClass.BACK_RANK, Square.file(teamClass.STARTING_KING_SQUARE)+2),
		[Queen.typeChar]: Square.withRankAndFile(teamClass.BACK_RANK, Square.file(teamClass.STARTING_KING_SQUARE)-2)
	};
	//rook goes 1 space closer to the center than the king
	teamClass.CASTLE_ROOK_SQUARES_BY_WING = {
		[King.typeChar]: 
		Square.withRankAndFile(teamClass.BACK_RANK, Square.file(teamClass.CASTLE_KING_SQUARES_BY_WING[King.typeChar])-1),
		[Queen.typeChar]: 
		Square.withRankAndFile(teamClass.BACK_RANK, Square.file(teamClass.CASTLE_KING_SQUARES_BY_WING[Queen.typeChar])+1),
	};
});

TEAM_CLASSES.forEach((teamClass)=>{
	teamClass.CASTLE_INTERMEDIATE_SQUARES_BITVECTOR_BY_WING = WINGS.reduce((accumulator, wing)=>{
		const intermediateSquaresBitVector = new BitVector64();
		const kingFile = Square.file(teamClass.STARTING_KING_SQUARE);
		const rookFile = Square.file(teamClass.STARTING_ROOK_SQUARES_BY_WING[wing]);
		const startFile = Math.min(kingFile, rookFile);
		const endFile = Math.max(kingFile, rookFile);
		for(let i=startFile+1; i<endFile; i++)
		{
			const square = Square.withRankAndFile(teamClass.BACK_RANK, i);
			intermediateSquaresBitVector.set(square);
		}
		accumulator[wing] = intermediateSquaresBitVector;
		return accumulator;
	}, {});
});

TEAM_CLASSES.forEach((teamClass)=>{
	teamClass.CASTLE_REQUIRED_SAFE_SQUARES_BITVECTOR_BY_WING = WINGS.reduce((accumulator, wing)=>{
		const requiredSafeSquaresBitVector = new BitVector64();
		const kingFile = Square.file(teamClass.STARTING_KING_SQUARE);
		const rookFile = Square.file(teamClass.STARTING_ROOK_SQUARES_BY_WING[wing]);
		const increment = Math.sign(rookFile-kingFile);
		for(let i=kingFile; i!=kingFile + (increment*3); i = i+increment)
		{
			const square = Square.withRankAndFile(teamClass.BACK_RANK, i);
			requiredSafeSquaresBitVector.set(square);
		}
		accumulator[wing] = requiredSafeSquaresBitVector;
		return accumulator;
	}, {});
});

TEAM_CLASSES.forEach((teamClass)=>{
	teamClass.BEST_POSSIBLE_SCORE = teamClass.SCORE_MULTIPLIER*(MAX_EVALUATION_SCORE + 1 + MAX_EVALUATION_DEPTH);
	teamClass.INF_SCORE = Infinity*teamClass.SCORE_MULTIPLIER;
});

module.exports = {
	Team:Team,
	WhiteTeam:WhiteTeam,
	BlackTeam:BlackTeam,
	TEAM_CLASSES:TEAM_CLASSES
}