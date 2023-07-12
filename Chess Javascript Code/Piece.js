const {Manager} = require("./Manager.js");
const {Square} = require("./Square.js");
const {BitVector} = require("./BitVector.js");

//for patterns that depend only on set offsets from a starting square
function squaresAndBitsInPatternFromSquareInGame(pattern,square, game)
{
	const squaresArray = [];
	const squaresBits = new BitVector();
	
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
	const squaresBits = new BitVector();
	
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
		
		this.kingSeer = new Manager();
		this.kingSeer.update(0);
		this.reachableSquares = new Manager();
		this.reachableSquares.update([]);
		this.reachableBits = new Manager();
		this.reachableBits.update(new BitVector());
	}
	
	activate()
	{
		this.team.activatePiece(this);
	}
	
	deactivate()
	{
		this.team.deactivatePiece(this);
	}
	
	updateReachableSquaresAndBitsAndKingSeer(kingSquare)
	{
		const reachables = this.constructor.findReachableSquaresAndBitsFromSquareInGame(this.square, this.game);
		this.reachableSquares.update(reachables[0]);
		this.reachableBits.update(reachables[1]);
		
		const oldKingSeer = this.kingSeer.get();
		this.kingSeer.update(this.reachableBits.get().read(kingSquare));
		const currentKingSeer = this.kingSeer.get();
		this.team.numKingSeers += currentKingSeer - oldKingSeer;
	}
	
	revertReachableSquaresAndBitsAndKingSeer(kingSquare)
	{
		this.reachableSquares.revert();
		this.reachableBits.revert();
		
		const oldKingSeer = this.kingSeer.get();
		this.kingSeer.revert();
		const currentKingSeer = this.kingSeer.get();
		this.team.numKingSeers += currentKingSeer - oldKingSeer;
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

		const oldKingSeer = this.kingSeer.get();
		this.kingSeer.update(this.reachableBits.get().read(kingSquare));
		const currentKingSeer = this.kingSeer.get();
		this.team.numKingSeers += currentKingSeer - oldKingSeer;
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