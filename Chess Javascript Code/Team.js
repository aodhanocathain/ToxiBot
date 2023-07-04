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
	allPieces;
	directionPieces;
	
	alivePatternPieces;
	deadPatternPieces;
	patternPieceSquares;
	nextPatternPieceId;
	
	aliveDirectionPieces;
	deadDirectionPieces;
	directionPieceSquares;
	nextDirectionPieceId;
	
	points;
	
	king;
	
	constructor()
	{		
		this.alivePatternPieces = [];
		this.aliveDirectionPieces = [];
		
		this.patternPieceSquares = [];
		this.directionPieceSquares = [];
		
		this.deadPatternPieces = [];
		this.deadDirectionPieces = [];
		
		this.nextPatternPieceId=0;
		this.nextDirectionPieceId=0;
		
		this.points = 0;
	}
	
	addPieceAtSquare(piece, square)
	{
		this.registerPieceAtSquare(piece, square);
		this.activatePiece(piece);
	}
	
	registerPieceAtSquare(piece, square)
	{
		if(piece instanceof PatternPiece)
		{
			piece.id = this.nextPatternPieceId;
			this.nextPatternPieceId++;
			
			this.patternPieceSquares[piece.id] = square;
		}
		else
		{
			piece.id = this.nextDirectionPieceId;
			this.nextDirectionPieceId++;
			
			this.directionPieceSquares[piece.id] = square;
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
	
	updateAllReachableSquaresAndBitsInGame(game)
	{
		this.alivePatternPieces.forEach((piece)=>{
			piece.updateReachableSquaresAndBitsFromSquareInGame(this.patternPieceSquares[piece.id],game);
		});
		this.aliveDirectionPieces.forEach((piece)=>{
			piece.updateReachableSquaresAndBitsFromSquareInGame(this.directionPieceSquares[piece.id],game);
		});
	}
	
	updateDirectionReachableSquaresAndBitsInGame(game)
	{
		this.aliveDirectionPieces.forEach((piece)=>{
			piece.updateReachableSquaresAndBitsFromSquareInGame(this.directionPieceSquares[piece.id],game);
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