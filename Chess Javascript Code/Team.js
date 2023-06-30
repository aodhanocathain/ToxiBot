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
	
	static scorePreferredToScore(newScore, oldScore)
	{
		throw "subclasses of Team must implement scorePreferredToScore";
	}
	
	static toString()
	{
		return `${this.char}`;
	}
	
	opposition;
	
	alivePieces;
	deadPieces;
	
	nextPieceId;
	
	points;
	
	king;
	
	constructor()
	{		
		this.alivePieces = [];
		this.deadPieces = [];
		
		this.points = 0;
		
		this.nextPieceId=0;
	}
	
	addPiece(piece)
	{
		this.registerPiece(piece);
		this.activatePiece(piece);
	}
	
	registerPiece(piece)
	{
		piece.id = this.nextPieceId;
		this.nextPieceId++;
		
		piece.team = this;
		
		if(piece instanceof King)
		{
			this.king = piece;
		}
	}
	
	activatePiece(piece)
	{
		this.alivePieces[piece.id] = piece;
		delete this.deadPieces[piece.id];
		this.points += piece.constructor.points;
	}
	
	deactivatePiece(piece)
	{
		this.deadPieces[piece.id] = piece;
		delete this.alivePieces[piece.id];
		this.points -= piece.constructor.points;
	}
	
	updateReachableSquares()
	{
		this.alivePieces.forEach((piece)=>{
			piece.updateReachableSquares();
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
		
		static scorePreferredToScore(newScore, oldScore)
		{
			return newScore > oldScore;
		}
		
		constructor()
		{
			super();
		}
	},

	class BlackTeam extends Team
	{
		static char = "b";
		
		static charConverter(char)
		{
			return char.toLowerCase();
		}
		
		static scorePreferredToScore(newScore, oldScore)
		{
			return newScore < oldScore;
		}
		
		constructor()
		{
			super();
		}
	}
];

module.exports = {
	Team:Team,
	
	TeamClassesArray: teamClassesArray
}