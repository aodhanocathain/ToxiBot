const {Piece, PatternPiece, DirectionPiece, PieceTypeCharClasses, PieceClassesArray} = require("./Piece.js");
const [King] = PieceClassesArray;

class Team
{
	static char;
	static charConverter;
	
	static charOfTeamedChar(teamedChar)
	{
		return teamClassesArray.find((team)=>{return team.charConverter(teamedChar)==teamedChar}).char;
	}
	
	static evalPreferredToEval(newEval, oldEval)
	{
		throw "subclasses of Team must implement evalPreferredToEval";
	}
	
	static toString()
	{
		return `${this.char}`;
	}
	
	game;
	
	opposition;
	
	activePieces;
	inactivePieces;	
	nextId;
	
	points;
	
	numKingSeers;
	
	king;
	
	constructor(game)
	{
		this.game = game;
		
		this.activePieces = [];
		this.inactivePieces = [];
		this.nextId = 0;
		
		this.numKingSeers = 0;
		
		this.points = 0;
	}
	
	addPiece(piece)
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
		const oppositionKingSquare = this.opposition.king.square;
		this.activePieces.forEach((piece)=>{
			piece.updateReachableSquaresAndBitsAndKingSeer(oppositionKingSquare);
		});
	}
	
	toString()
	{
		return this.constructor.toString();
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
		
		static evalPreferredToEval(newEval, oldEval)
		{
			return (newEval?.score) > (oldEval?.score ?? -Infinity);
		}
	},

	class BlackTeam extends Team
	{
		static char = "b";
		
		static charConverter(char)
		{
			return char.toLowerCase();
		}
		
		static evalPreferredToEval(newEval, oldEval)
		{
			return (newEval?.score) < (oldEval?.score ?? Infinity);
		}
	}
];

module.exports = {
	Team:Team,
	
	TeamClassesArray: teamClassesArray
}