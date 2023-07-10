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
	
	alivePieces;
	deadPieces;	
	nextId;
	
	points;
	
	numKingSeers;
	
	king;
	
	constructor(game)
	{
		this.game = game;
		
		this.alivePieces = [];
		this.deadPieces = [];
		this.nextId = 0;
		
		this.numKingSeers = 0;
		
		this.points = 0;
	}
	
	generateId()
	{
		return this.nextId++;
	}
	
	addPiece(piece)
	{
		this.registerPiece(piece);
		this.activatePiece(piece);
	}
	
	registerPiece(piece)
	{
		piece.id = this.nextId;
		this.nextId++;
		
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
	
	updateReachableSquaresAndBitsAndKingSeers()
	{
		const oppositionKingSquare = this.opposition.king.square;
		this.alivePieces.forEach((piece)=>{
			piece.updateReachableSquaresAndBitsAndKingSeer(oppositionKingSquare);
		});
	}
	
	revertReachableSquaresAndBitsAndKingSeers()
	{
		this.alivePieces.forEach((piece)=>{
			piece.revertReachableSquaresAndBitsAndKingSeer();
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