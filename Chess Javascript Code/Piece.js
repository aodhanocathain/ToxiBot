const {Manager} = require("./Manager.js");
const {Square} = require("./Square.js");
const {BitVector64} = require("./BitVector64.js");

//for patterns that depend only on set offsets from a starting square
function squaresAndBitsInPatternFromSquareInGame(pattern,square, game)
{
	const squaresArray = [];
	const squaresBits = new BitVector64();
	
	const rank = Square.rank(square);
	const file = Square.file(square);
	
	for(let i=0; i<pattern.length; i+=2)
	{
		const newRank = rank + pattern[i];
		const newFile = file + pattern[i+1];
		//if it is in the board, include it
		if(((newRank|newFile)>>3)==0)
		{
			const newSquare = Square.make(newRank,newFile);
			squaresArray.push(newSquare);
			squaresBits.set(newSquare);
		}
	}
	
	return [squaresArray, squaresBits];
}

//for patterns that extend as far as possible in directions from a starting square
function squaresAndBitsInDirectionsFromSquareInGame(directions,square,game)
{
	const rays = [];
	const squaresBits = new BitVector64();
	
	const squaresOccupiedBitVector = game.squaresOccupiedBitVector;
	
	const rank = Square.rank(square);
	const file = Square.file(square);
	
	for(let i=0; i<directions.length; i+=2)
	{
		const squaresArray = [];
		
		const rankOffset = directions[i];
		const fileOffset = directions[i+1];
		
		let newRank = rank+rankOffset;
		let newFile = file+fileOffset;
		let blocked = false;
		
		while((((newRank|newFile)>>3)==0) && !blocked)
		{
			const newSquare = Square.make(newRank,newFile);
			
			squaresArray.push(newSquare);
			squaresBits.set(newSquare);
			
			blocked = squaresOccupiedBitVector.read(newSquare);
			newRank += rankOffset;
			newFile += fileOffset;
		}
		rays.push(squaresArray);
	}
	return [rays,squaresBits];
}

class Piece
{
	static typeChar;
	
	static points;
	
	static typeCharOfTeamedChar(teamedChar)
	{
		return teamedChar.toUpperCase();
	}
	
	static findReachableSquaresAndBitsFromSquareInGame(square, game)
	{
		throw "subclasses of Piece must implement findReachableSquaresAndBitsFromSquareInGame";
	}
	
	game;
	team;
	square;
	id;
	moved;
	
	kingSeer;
	
	reachableSquares;
	reachableBits;
	
	constructor(game, team, square, id, moved)
	{
		this.game = game;
		this.team = team;
		this.square = square;
		this.id = id;
		this.moved = false;
		
		this.kingSeer = false;
		
		this.reachableSquares = new Manager();
		this.reachableSquares.update([]);
		this.reachableBits = new Manager();
		this.reachableBits.update(new BitVector64());
	}
	
	activate()
	{
		this.team.activatePiece(this);
		if(this.kingSeer){this.team.numKingSeers++;}
	}
	
	deactivate()
	{
		this.team.deactivatePiece(this);
		if(this.kingSeer){this.team.numKingSeers--;}
	}
	
	correctKingSeer(kingSquare)
	{
		if(this.kingSeer == !(this.reachableBits.get().read(kingSquare)))
		{
			this.kingSeer = !this.kingSeer;
			this.team.numKingSeers += (this.kingSeer? 1 : -1);
		}
	}
	
	updateReachableSquaresAndBitsAndKingSeer(kingSquare)
	{
		const reachables = this.constructor.findReachableSquaresAndBitsFromSquareInGame(this.square, this.game);
		this.reachableSquares.update(reachables[0]);
		this.reachableBits.update(reachables[1]);
		this.correctKingSeer(kingSquare);
		/*
		if(this.kingSeer==false)
		{
			if(reachables[0].read(kingSquare))
			{
				this.kingSeer = true;
				this.team.addKingSeer();
			}
		}
		else
		{
			if(!(reachables[0].read(kingSquare)))
			{
				this.kingSeer = false;
				this.team.subKingSeer();
			}
		}
		*/
	}
	
	revertReachableSquaresAndBitsAndKingSeer(kingSquare)
	{
		this.reachableSquares.revert();
		this.reachableBits.revert();
		this.correctKingSeer(kingSquare);
	}
	
	toString()
	{
		return `${this.team.charConverter(this.constructor.typeChar)}`;
	}
}

class PatternPiece extends Piece
{
	static pattern;
	
	static findReachableSquaresAndBitsFromSquareInGame(square, game)
	{
		return squaresAndBitsInPatternFromSquareInGame(this.pattern,square,game);
	}
}

class DirectionPiece extends Piece
{
	static directions;
	
	static findReachableSquaresAndBitsFromSquareInGame(square, game)
	{
		return squaresAndBitsInDirectionsFromSquareInGame(this.directions,square,game);
	}

	rays;
	
	constructor(game, team, square, id, moved)
	{
		super(game, team, square, id, moved);
		this.rays = this.constructor.directions.map((direction)=>{return [];});
	}
	
	updateReachableSquaresAndBitsAndKingSeer(kingSquare)
	{
		const reachables = this.constructor.findReachableSquaresAndBitsFromSquareInGame(this.square, this.game);
		reachables[0].forEach((ray, index)=>{this.rays[index] = ray;})
		this.reachableSquares.update(this.rays.flat(1));
		this.reachableBits.update(reachables[1]);
		this.correctKingSeer(kingSquare);
	}
}

const pieceClassesArray = [

	class King extends PatternPiece
	{
		static typeChar = "K";
		
		static points = 0;
		
		static pattern = [
			-1,-1,
			0,-1,
			1,-1,
			-1,0,
			1,0,
			-1,1,
			0,1,
			1,1
		];
	},

	class Knight extends PatternPiece
	{
		static typeChar = "N";
		
		static points = 3;
		
		static pattern = [
			-2,-1,
			-2,1,
			-1,-2,
			-1,2,
			1,-2,
			1,2,
			2,-1,
			2,1
		];
	},

	class Bishop extends DirectionPiece
	{
		static typeChar = "B";
		
		static points = 3;
		
		static directions = [
			-1,-1,
			1,-1,
			-1,1,
			1,1
		];
	},

	class Rook extends DirectionPiece
	{
		static typeChar = "R";
		
		static points = 5;
		
		static directions = [
			0,-1,
			-1,0,
			1,0,
			0,1
		];
	},

	class Queen extends DirectionPiece
	{
		static typeChar = "Q";
		
		static points = 9;
		
		static directions = [
			-1,-1,
			0,-1,
			1,-1,
			-1,0,
			1,0,
			-1,1,
			0,1,
			1,1
		];
	}
];

//match piece type characters to classes
const pieceTypeCharClasses = pieceClassesArray.reduce((accumulator, pieceClass)=>{
	accumulator[pieceClass.typeChar] = pieceClass;
	return accumulator;
}, {});

module.exports = {
	Piece:Piece,
	PatternPiece:PatternPiece,
	DirectionPiece:DirectionPiece,
	
	PieceClassesArray: pieceClassesArray,
	
	PieceTypeCharClasses: pieceTypeCharClasses,
}