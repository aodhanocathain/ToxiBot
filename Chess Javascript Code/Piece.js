//for patterns that depend only on set offsets from a starting square
function squaresInPatternFromSquare(pattern,square)
{
	const squares = [];
	for(let i=0; i<pattern.length; i+=2)
	{
		//step to the next square
		const offsetSquare = square.offset(pattern[i], pattern[i+1]);
		//if it is in the board, include it
		if(offsetSquare){squares.push(offsetSquare);}
	}
	
	return squares;
}

//for patterns that extend as far as possible in directions from a starting square
function squaresInDirectionsFromSquare(directions, square)
{
	const squares = [];
	for(let i=0; i<directions.length; i+=2)
	{
		const rankOffset = directions[i];
		const fileOffset = directions[i+1];
		let offsetSquare = square;
		do
		{
			//step to the next square
			offsetSquare = offsetSquare.offset(rankOffset,fileOffset);
			squares.push(offsetSquare)
		}
		while(offsetSquare && !offsetSquare.piece)	//if piece is found, can go no further
		if(!offsetSquare)
		{
			squares.pop();
		}
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