const {Piece, PatternPiece, DirectionPiece, PieceTypeCharClasses, PieceClassesArray} = require("./Piece.js");
const [King] = PieceClassesArray;

class Team
{
	char;
	charConverter;
	name;
	
	static charOfTeamedChar(teamedChar)
	{
		return teamClassesArray.find((team)=>{return team.charConverter(teamedChar)==teamedChar}).char;
	}
	
	static evalPreferredToEval(newEval, oldEval)
	{
		throw "subclasses of Team must implement evalPreferredToEval";
	}
	
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
}

const teamClassesArray = [
	class WhiteTeam extends Team
	{
		static char = "w";
		static charConverter(char)
		{
			return char.toUpperCase();
		}
		static name = "white";
		
		static evalPreferredToEval(newEval, oldEval)
		{
			const iGiveCheckmate = (newEval?.checkmate_in_halfmoves % 2) == 0;
			const iGaveCheckmate = (oldEval?.checkmate_in_halfmoves % 2) == 0;
			const iTakeCheckmate = (newEval?.checkmate_in_halfmoves % 2) == 1;
			const iTookCheckmate = (oldEval?.checkmate_in_halfmoves % 2) == 1;
			const giveMateInHalfmoves = newEval?.checkmate_in_halfmoves;
			const gaveMateInHalfMoves = oldEval?.checkmate_in_halfmoves;
			
			if(iTookCheckmate)
			{
				return (!iTakeCheckmate) || (iTakeCheckmate && (giveMateInHalfmoves > gaveMateInHalfMoves));
			}
			else
			{
				if(iGaveCheckmate)
				{
					return (iGiveCheckmate) && (giveMateInHalfmoves < gaveMateInHalfMoves);
				}
				else
				{
					return (iGiveCheckmate) || (newEval?.score > ((oldEval?.score) ?? -Infinity));
				}
			}
		}
	},

	class BlackTeam extends Team
	{
		static char = "b";
		static charConverter(char)
		{
			return char.toLowerCase();
		}
		static name = "black";
		
		static evalPreferredToEval(newEval, oldEval)
		{
			const iGiveCheckmate = (newEval?.checkmate_in_halfmoves % 2) == 0;
			const iGaveCheckmate = (oldEval?.checkmate_in_halfmoves % 2) == 0;
			const iTakeCheckmate = (newEval?.checkmate_in_halfmoves % 2) == 1;
			const iTookCheckmate = (oldEval?.checkmate_in_halfmoves % 2) == 1;
			const giveMateInHalfmoves = newEval?.checkmate_in_halfmoves;
			const gaveMateInHalfMoves = oldEval?.checkmate_in_halfmoves;
			
			if(iTookCheckmate)
			{
				return (!iTakeCheckmate) || (iTakeCheckmate && (giveMateInHalfmoves > gaveMateInHalfMoves));
			}
			else
			{
				if(iGaveCheckmate)
				{
					return (iGiveCheckmate) && (giveMateInHalfmoves < gaveMateInHalfMoves);
				}
				else
				{
					return (iGiveCheckmate) || (newEval?.score < ((oldEval?.score) ?? Infinity));
				}
			}
		}
	}
];

const teamClassNames = teamClassesArray.map((teamClass)=>{return teamClass.name;});

module.exports = {
	Team:Team,
	TeamClassNames: teamClassNames,
	TeamClassesArray: teamClassesArray
}