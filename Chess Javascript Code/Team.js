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
	
	opposition;
	
	alivePieces;
	deadPieces;	
	nextId;
	
	pieceSquares;
	
	points;
	
	king;
	
	constructor()
	{		
		this.alivePieces = [];
		this.deadPieces = [];
		this.nextId = 0;
		
		this.pieceSquares = [];
		
		this.points = 0;
	}
	
	addPieceAtSquare(piece, square)
	{
		this.registerPieceAtSquare(piece, square);
		this.activatePiece(piece);
	}
	
	registerPieceAtSquare(piece, square)
	{
		piece.id = this.nextId;
		this.nextId++;
		this.pieceSquares[piece.id] = square;
		
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
	
	updateReachableSquaresAndBitsInGame(game)
	{
		this.alivePieces.forEach((piece)=>{
			piece.updateReachableSquaresAndBitsFromSquareInGame(this.pieceSquares[piece.id],game);
		});
	}
	
	revertReachableSquaresAndBits()
	{
		this.alivePieces.forEach((piece)=>{
			piece.revertReachableSquaresAndBits();
		});
	}
	
	updatePieceSquare(piece, square)
	{
		this.pieceSquares[piece.id] = square;
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
			return oldEval.illegal || (newEval.score > oldEval.score);
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
		
		static evalPreferredToEval(newEval, oldEval)
		{
			return oldEval.illegal || (newEval.score < oldEval.score);
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