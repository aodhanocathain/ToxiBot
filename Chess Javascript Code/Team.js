const {Piece, PatternPiece, DirectionPiece, PieceClassesByTypeChar, King} = require("./Piece.js");

class Team
{
	static char;
	static charConverter(char)
	{
		throw "subclasses of Team must implement charConverter";
	}
	static name;
	static classOfTeamedChar(teamedChar)
	{
		return TEAM_CLASSES.find((teamClass)=>{return teamClass.charConverter(teamedChar)==teamedChar;});
	}
	static MOVE_COLOUR;
	
	game;
	
	activePieces;
	inactivePieces;	
	nextId;
	
	points;
	numKingSeers;
	
	king;
	
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
	}
	
	addActivePiece(piece)
	{
		this.registerPiece(piece);
		this.activatePiece(piece);
	}
	
	registerPiece(piece)
	{
		piece.id = this.nextId++;
		piece.team = this;
		
		if(piece instanceof King)
		{
			this.king = piece;
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
	
	init()
	{
		this.activePieces.forEach((piece)=>{
			piece.updateReachableSquaresAndBitsAndKingSeer();
		});
	}
	
	scorePreferredToScore(newScore, oldScore)
	{
		throw "subclasses of Team must implement scorePreferredToScore";
	}
	
	evalPreferredToEval(newEval, oldEval)
	{
		//work out if what happens in newEval is better than what happened in oldEval
		
		//any even number of halfmoves ago, the same team was moving
		const iGiveCheckmate = (newEval?.checkmate_in_halfmoves % 2) == 0;
		const iGaveCheckmate = (oldEval?.checkmate_in_halfmoves % 2) == 0;
		
		//any odd number of halfmoves ago, the other team was moving
		const iTakeCheckmate = (newEval?.checkmate_in_halfmoves % 2) == 1;
		const iTookCheckmate = (oldEval?.checkmate_in_halfmoves % 2) == 1;
		
		const giveMateInHalfmoves = newEval?.checkmate_in_halfmoves;
		const gaveMateInHalfMoves = oldEval?.checkmate_in_halfmoves;
		
		if(iTookCheckmate)	//due to be checkmated in old continuation
		{
			//better continuations escape or delay the checkmate
			return (newEval && !iTakeCheckmate) ||	//escape checkmate
			(iTakeCheckmate && (giveMateInHalfmoves > gaveMateInHalfMoves));	//delay checkmate
		}
		else	//not due to be checkmated in old continuation
		{
			if(iGaveCheckmate)	//already due to give checkmate in old continuation
			{
				//better continuations give checkmate sooner
				return (iGiveCheckmate) && (giveMateInHalfmoves < gaveMateInHalfMoves);
			}
			else	//not due to give checkmate in old continuation
			{
				//better continuations find checkmate or beat old score, or exist if old does not exist
				return (iGiveCheckmate) ||	//checkmate
				this.scorePreferredToScore(newEval?.score, oldEval?.score) ||	//better score
				(newEval && !oldEval);	//if old does not exist in the first place
			}
		}
	}
}

const WhiteTeam = class extends Team
{
	static char = "w";
	static charConverter(char)
	{
		return char.toUpperCase();
	}
	static name = "white";
	static MOVE_COLOUR = "#ffff80";
	
	scorePreferredToScore(newScore, oldScore)
	{
		return (newScore > (oldScore ?? -Infinity));
	}
};

const BlackTeam = class extends Team
{
	static char = "b";
	static charConverter(char)
	{
		return char.toLowerCase();
	}
	static name = "black";
	static MOVE_COLOUR = "#80ffff";
	
	scorePreferredToScore(newScore, oldScore)
	{
		return (newScore < (oldScore ?? Infinity));
	}
}

const TEAM_CLASSES = [WhiteTeam, BlackTeam];

module.exports = {
	Team:Team,
	WhiteTeam:WhiteTeam,
	BlackTeam:BlackTeam,
	TEAM_CLASSES:TEAM_CLASSES
}