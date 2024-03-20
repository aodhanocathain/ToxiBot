const {NUM_FILES, NUM_RANKS, MAX_EVALUATION_SCORE, MAX_EVALUATION_DEPTH} = require("./Constants.js");
const {Manager} = require("./Manager.js");
const {Square} = require("./Square.js");
const {CastleMove} = require("./Move.js");
const {King, Queen, Rook, WINGS} = require("./Piece.js");
const {BitVector64} = require("./BitVector64.js");
const { intsUpTo } = require("./Helpers.js");

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

	static CASTLE_MOVES_LOOKUP;
	
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
	
	idsSeeingOpposingCastleSafeSquaresBitVectorByWing;
	idsSeeingOpposingKingBitVector;
	
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
		
		this.idsSeeingOpposingCastleSafeSquaresBitVectorByWing = WINGS.reduce((accumulator, wing)=>{
			accumulator[wing] = new BitVector64();
			return accumulator;
		}, {});
		this.idsSeeingOpposingKingBitVector = new BitVector64();
		
		this.points = 0;
		
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
			piece.canCastle = new Manager(piece.square==this.constructor.STARTING_KING_SQUARE)	//assume the king did not move yet
			//the game castling rights are used to verify this anyway
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
		this.idsSeeingOpposingKingBitVector.write(piece.seesOpposingKing.get(), piece.id);
	}
	
	deactivatePiece(piece)
	{
		this.inactivePieces[piece.id] = piece;
		delete this.activePieces[piece.id];
		this.activePieceLocationsBitVector.clear(piece.square);
		this.points -= piece.constructor.points;
		this.idsSeeingOpposingKingBitVector.clear(piece.id);
	}
	
	updatePiece(piece)
	{
		piece.updateAllProperties();
		WINGS.forEach((wing)=>{
			const seenSquares = piece.squaresAttacked.get().bits();
			seenSquares.and(this.opposition.constructor.CASTLE_REQUIRED_SAFE_SQUARES_BITVECTOR_BY_WING[wing]);
			const seesSquare = !(seenSquares.isEmpty());
			this.idsSeeingOpposingCastleSafeSquaresBitVectorByWing[wing].write(seesSquare, piece.id);
		});
		this.idsSeeingOpposingKingBitVector.write(piece.seesOpposingKing.get(), piece.id);
	}
	
	revertPiece(piece)
	{
		piece.revertAllProperties();
		WINGS.forEach((wing)=>{
			const seenSquares = piece.squaresAttacked.get().bits();
			seenSquares.and(this.opposition.constructor.CASTLE_REQUIRED_SAFE_SQUARES_BITVECTOR_BY_WING[wing]);
			const seesSquare = !(seenSquares.isEmpty());
			this.idsSeeingOpposingCastleSafeSquaresBitVectorByWing[wing].write(seesSquare, piece.id);
		});
		this.idsSeeingOpposingKingBitVector.write(piece.seesOpposingKing.get(), piece.id);	
	}
	
	swapOldPieceForNewPiece(oldPiece, newPiece)
	{
		newPiece.id = oldPiece.id;
		
		this.deactivatePiece(oldPiece);
		this.activatePiece(newPiece);
	}
	
	gatherMoves()
	{
		const moves = [];
		
		this.activePieces.forEach((piece)=>{
			piece.addMovesToArray(moves);
		});

		const kingCanCastle = this.king.canCastle.get() && this.opposition.idsSeeingOpposingKingBitVector.isEmpty();
		let bits = WINGS.reduce((accumulator, wing, wingIndex)=>{
			if(kingCanCastle)
			{
				const rook = this.rooksInStartSquaresByWing[wing];
				//rook must not have moved
				if(rook?.canCastle.get() && rook?.isActive())
				{
					//must not be any pieces between king and rook
					const blockingPieceLocationsBitVector = this.activePieceLocationsBitVector.clone();
					blockingPieceLocationsBitVector.or(this.opposition.activePieceLocationsBitVector);
					blockingPieceLocationsBitVector.and(this.constructor.CASTLE_INTERMEDIATE_SQUARES_BITVECTOR_BY_WING[wing]);
					const noPiecesBetween = blockingPieceLocationsBitVector.isEmpty();
					const squaresAreSafe = this.opposition.idsSeeingOpposingCastleSafeSquaresBitVectorByWing[wing].isEmpty();
					if(noPiecesBetween && squaresAreSafe)
					{
						accumulator |= (1<<wingIndex);
					}
				}
			}
			return accumulator;
		}, 0);

		moves.push(this.constructor.CASTLE_MOVES_LOOKUP[bits]);

		return moves;
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
	//lookup by sequence of bits where each bit indicates ability to castle in some wing
	teamClass.CASTLE_MOVES_LOOKUP = intsUpTo(1<<WINGS.length).map((bits)=>{
		return WINGS.reduce((accumulator, wing, wingIndex)=>{
			const canCastleThisWing = !!((bits>>wingIndex)&1);
			if(canCastleThisWing)
			{
				accumulator.push(new CastleMove(
					teamClass.STARTING_KING_SQUARE, teamClass.CASTLE_KING_SQUARES_BY_WING[wing],
					teamClass.STARTING_ROOK_SQUARES_BY_WING[wing], teamClass.CASTLE_ROOK_SQUARES_BY_WING[wing]
				));
			}
			return accumulator;
		}, []);
	});
})

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