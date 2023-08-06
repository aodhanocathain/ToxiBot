const {King, Queen, Rook} = require("./Piece.js");
const {Square} = require("./Square.js");
const {Manager} = require("./Manager.js");
const {NUM_FILES, NUM_RANKS} = require("./Constants.js");

class Team
{
	static char;
	static name;
	static MOVE_COLOUR;
	static BACK_RANK;
	
	static PAWN_START_RANK;
	static PAWN_RANK_INCREMENT;
	
	//assigned manually near the end of this file, after team class declarations
	static STARTING_KING_SQUARE;
	static STARTING_ROOK_SQUARES_BY_WINGCHAR;
	static CASTLE_KING_SQUARES_BY_WINGCHAR;
	static CASTLE_ROOK_SQUARES_BY_WINGCHAR
	
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
	
	points;
	numKingSeers;
	
	king;
	rooksInStartSquaresByWingChar;
	
	//assigned by the team's game
	opposition;
	
	constructor(game)
	{
		this.game = game;
		
		this.activePieces = [];
		this.inactivePieces = [];
		this.nextId = 0;
		
		this.points = 0;
		this.numKingSeers = 0;
		
		this.rooksInStartSquaresByWingChar = {};
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
			if(piece.square==this.constructor.STARTING_ROOK_SQUARES_BY_WINGCHAR[Queen.typeChar])
			{
				this.rooksInStartSquaresByWingChar[Queen.typeChar] = piece;
				//assume it is the original rook and that it never moved
				piece.canCastle = new Manager(true);
				//the game castling rights are used to verify this anyway
			}
			else if(piece.square==this.constructor.STARTING_ROOK_SQUARES_BY_WINGCHAR[King.typeChar])
			{
				this.rooksInStartSquaresByWingChar[King.typeChar] = piece;
				//assume it is the original rook and that it never moved
				piece.canCastle = new Manager(true);
				//the game castling rights are used to verify this anyway
			}
			else
			{
				piece.canCastle = new Manager(false);
			}
		}
	}
	
	activatePiece(piece)
	{
		this.activePieces[piece.id] = piece;
		delete this.inactivePieces[piece.id];
		this.points += piece.constructor.points;
		this.numKingSeers += piece.kingSeer.get();
	}
	
	deactivatePiece(piece)
	{
		this.inactivePieces[piece.id] = piece;
		delete this.activePieces[piece.id];
		this.points -= piece.constructor.points;
		this.numKingSeers -= piece.kingSeer.get();
	}
	
	swapOldPieceForNewPiece(oldPiece, newPiece)
	{
		newPiece.id = oldPiece.id;
		
		this.points -= oldPiece.constructor.points;
		this.numKingSeers -= oldPiece.kingSeer.get();
		
		this.activePieces[oldPiece.id] = newPiece;
		
		this.points += newPiece.constructor.points;
		this.points += newPiece.kingSeer.get();
		
		//piece updates team king seers in updateKnowledge
		//this.numKingSeers += newPiece.kingSeer.get();
	}
	
	init()
	{
		this.activePieces.forEach((piece)=>{
			piece.updateKnowledge();
		});
	}
	
	scorePreferredToScore(newScore, oldScore)
	{
		throw "scorePreferredToScore called but not implemented";
	}
	
	evalPreferredToEval(newEval, oldEval)
	{
		//work out if what happens in newEval is better than what happened in oldEval
		if(!newEval){return false;}
		if(!oldEval){return true;}
		
		//any even number of halfmoves ago, this team was moving
		const iGiveCheckmate = (newEval.checkmate_in_halfmoves % 2) == 0;
		const iGaveCheckmate = (oldEval.checkmate_in_halfmoves % 2) == 0;
		
		//any odd number of halfmoves ago, the other team was moving
		const iGetCheckmated = (newEval.checkmate_in_halfmoves % 2) == 1;
		const iGotCheckmated = (oldEval.checkmate_in_halfmoves % 2) == 1;
		
		const giveMateInHalfmoves = newEval.checkmate_in_halfmoves;
		const gaveMateInHalfMoves = oldEval.checkmate_in_halfmoves;
		
		if(iGotCheckmated)	//due to be checkmated in old continuation
		{
			//better continuations escape or delay the checkmate
			return (!iGetCheckmated) ||	//escape checkmate
			(giveMateInHalfmoves > gaveMateInHalfMoves);	//delay checkmate
		}
		else	//not due to be checkmated in old continuation
		{
			if(iGaveCheckmate)	//already due to give checkmate in old continuation
			{
				//better continuations give checkmate sooner
				return iGiveCheckmate && (giveMateInHalfmoves < gaveMateInHalfMoves);
			}
			else	//not due to give checkmate in old continuation
			{
				//better continuations find checkmate or beat old score
				return iGiveCheckmate ||	//checkmate
				this.scorePreferredToScore(newEval.score, oldEval.score);	//better score
			}
		}
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
	
	static charConverter(char)
	{
		return char.toUpperCase();
	}
	
	scorePreferredToScore(newScore, oldScore)
	{
		return (newScore > (oldScore ?? -Infinity));
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
	
	static charConverter(char)
	{
		return char.toLowerCase();
	}
	
	scorePreferredToScore(newScore, oldScore)
	{
		return (newScore < (oldScore ?? Infinity));
	}
}

const TEAM_CLASSES = [WhiteTeam, BlackTeam];

TEAM_CLASSES.forEach((teamClass)=>{
	//king starts on the e-file
	teamClass.STARTING_KING_SQUARE = Square.make(teamClass.BACK_RANK, 4);
	teamClass.STARTING_ROOK_SQUARES_BY_WINGCHAR = {
		//king rook starts on the h-file
		[King.typeChar]: Square.make(teamClass.BACK_RANK, NUM_FILES-1),
		//queen rook starts on the a-file
		[Queen.typeChar]: Square.make(teamClass.BACK_RANK, 0)
	};
	
	//king goes 2 spaces towards the edge
	teamClass.CASTLE_KING_SQUARES_BY_WINGCHAR = {
		[King.typeChar]: Square.make(teamClass.BACK_RANK, Square.file(teamClass.STARTING_KING_SQUARE)+2),
		[Queen.typeChar]: Square.make(teamClass.BACK_RANK, Square.file(teamClass.STARTING_KING_SQUARE)-2)
	};
	//rook goes 1 space closer to the center than the king
	teamClass.CASTLE_ROOK_SQUARES_BY_WINGCHAR = {
		[King.typeChar]: 
		Square.make(teamClass.BACK_RANK, Square.file(teamClass.CASTLE_KING_SQUARES_BY_WINGCHAR[King.typeChar])-1),
		[Queen.typeChar]: 
		Square.make(teamClass.BACK_RANK, Square.file(teamClass.CASTLE_KING_SQUARES_BY_WINGCHAR[Queen.typeChar])+1),
	};
});

module.exports = {
	Team:Team,
	WhiteTeam:WhiteTeam,
	BlackTeam:BlackTeam,
	TEAM_CLASSES:TEAM_CLASSES
}