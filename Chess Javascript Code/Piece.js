const {Direction, UP, DOWN, LEFT, RIGHT, UP_AND_LEFT, UP_AND_RIGHT, DOWN_AND_LEFT, DOWN_AND_RIGHT} = require("./Direction.js");

//for patterns that depend only on set offsets from a starting square
function squaresInPatternFromSquare(pattern,square)
{
	const squares = [];
	for(const direction of pattern)
	{
		//step to the next square
		const offsetSquare = square.offset(direction);
		//if it is in the board, include it
		if(offsetSquare){squares.push(offsetSquare);}
	}
	return squares;
}

//for patterns that extend as far as possible in directions from a starting square
function squaresInDirectionsFromSquare(directions, square)
{
	const squares = [];
	for(const direction of directions)
	{
		let offsetSquare = square;
		do
		{
			//step to the next square
			offsetSquare = offsetSquare.offset(direction);
			//if still in the board, include it
			if(offsetSquare){squares.push(offsetSquare)}
			//if off the board, can go no further
			else{break;}
		}
		while(!(offsetSquare.piece instanceof Piece))	//if piece is found, can go no further
	}
	return squares;
}

class Piece
{
	static typeChar;
	
	static points;
	
	static typeCharOfTeamedChar(teamedChar)
	{
		return teamedChar.toUpperCase();
	}
	
	static findReachableSquaresFromSquare(square)
	{
		throw "subclasses of Piece must implement findReachableSquaresFromSquare";
	}
	
	moved;
	square;
	
	team;	
	id;
	
	reachableSquares;
	
	constructor()
	{
		this.moved = false;
	}
	
	activate()
	{
		this.team.activatePiece(this);
	}
	
	deactivate()
	{
		this.team.deactivatePiece(this);
	}
	
	//call only for squares without pieces
	putInEmptySquare(square)
	{
		square.piece = this;
		this.square = square;
	}
	
	//could be called for squares that already have pieces
	moveToSquare(toSquare)
	{
		//tell the current square to forget
		this.square.piece = null;
		
		//clear the toSquare for this piece
		toSquare.piece?.deactivate();
		
		this.putInEmptySquare(toSquare);
		
		this.moved = true;
	}
	
	updateReachableSquares()
	{
		this.reachableSquares = this.constructor.findReachableSquaresFromSquare(this.square);
	}
	
	toString()
	{
		return `${this.team.charConverter(this.constructor.typeChar)}`;
	}
}

class PatternPiece extends Piece
{
	static pattern;
	
	static findReachableSquaresFromSquare(square)
	{
		return squaresInPatternFromSquare(this.pattern,square);
	}
}

class DirectionPiece extends Piece
{
	static directions;
	
	static findReachableSquaresFromSquare(square)
	{
		return squaresInDirectionsFromSquare(this.directions,square);
	}
}

const pieceClassesArray = [

	class King extends PatternPiece
	{
		static typeChar = "K";
		
		static points = 0;
		
		static pattern = [
			DOWN_AND_LEFT,
			LEFT,
			UP_AND_LEFT,
			DOWN,
			UP,
			DOWN_AND_RIGHT,
			RIGHT,
			UP_AND_RIGHT
		];
	},

	class Knight extends PatternPiece
	{
		static typeChar = "N";
		
		static points = 3;
		
		static pattern = [
			new Direction(-2,-1),
			new Direction(-2,1),
			new Direction(-1,-2),
			new Direction(-1,2),
			new Direction(1,-2),
			new Direction(1,2),
			new Direction(2,-1),
			new Direction(2,1)
		];
	},

	class Bishop extends DirectionPiece
	{
		static typeChar = "B";
		
		static points = 3;
		
		static directions = [
			UP_AND_RIGHT,
			UP_AND_LEFT,
			DOWN_AND_RIGHT,
			DOWN_AND_LEFT
		];
	},

	class Rook extends DirectionPiece
	{
		static typeChar = "R";
		
		static points = 5;
		
		static directions = [
			LEFT,
			DOWN,
			UP,
			RIGHT
		];
	},

	class Queen extends DirectionPiece
	{
		static typeChar = "Q";
		
		static points = 9;
		
		static directions = [
			DOWN_AND_LEFT,
			LEFT,
			UP_AND_LEFT,
			DOWN,
			UP,
			DOWN_AND_RIGHT,
			RIGHT,
			UP_AND_RIGHT,
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