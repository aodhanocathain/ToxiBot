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
	
	alivePatternPieces;
	deadPatternPieces;
	nextPatternPieceId;	
	
	aliveDirectionPieces;
	deadDirectionPieces;
	nextDirectionPieceId;
	
	points;
	
	king;
	
	constructor()
	{		
		this.alivePatternPieces = [];
		this.aliveDirectionPieces = [];
		
		this.deadPatternPieces = [];
		this.deadDirectionPieces = [];
		
		this.nextPatternPieceId=0;
		this.nextDirectionPieceId=0;
		
		this.points = 0;
	}
	
	addPiece(piece)
	{
		this.registerPiece(piece);
		this.activatePiece(piece);
	}
	
	registerPiece(piece)
	{
		if(piece instanceof PatternPiece)
		{
			piece.id = this.nextPatternPieceId;
			this.nextPatternPieceId++;
		}
		else
		{
			piece.id = this.nextDirectionPieceId;
			this.nextDirectionPieceId++;
		}
		
		piece.team = this;
		
		if(piece instanceof King)
		{
			this.king = piece;
		}
	}
	
	activatePiece(piece)
	{
		if(piece instanceof PatternPiece)
		{
			this.alivePatternPieces[piece.id] = piece;
			delete this.deadPatternPieces[piece.id];
		}
		else
		{
			this.aliveDirectionPieces[piece.id] = piece;
			delete this.deadDirectionPieces[piece.id];
		}
		this.points += piece.constructor.points;
	}
	
	deactivatePiece(piece)
	{
		if(piece instanceof PatternPiece)
		{
			this.deadPatternPieces[piece.id] = piece;
			delete this.alivePatternPieces[piece.id];
		}
		else
		{
			this.deadDirectionPieces[piece.id] = piece;
			delete this.aliveDirectionPieces[piece.id];
		}
		this.points -= piece.constructor.points;
	}
	
	updateAllReachableSquares()
	{
		this.alivePatternPieces.forEach((piece)=>{
			piece.updateReachableSquares();
		});
		this.aliveDirectionPieces.forEach((piece)=>{
			piece.updateReachableSquares();
		});
	}
	
	updateDirectionReachableSquares()
	{
		this.aliveDirectionPieces.forEach((piece)=>{
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