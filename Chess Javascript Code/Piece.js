const {Manager} = require("./Manager.js");
const {Square} = require("./Square.js");
const {BitVector} = require("./BitVector.js");

const Canvas = require("canvas");

//for patterns that depend only on set offsets from a starting square
function squaresAndBitsInPatternFromSquareInGame(pattern, square, game)
{
	const squaresArray = [];
	const squaresBits = new BitVector();
	
	const rank = Square.rank(square);
	const file = Square.file(square);
	
	for(const [rankOffset,fileOffset] of pattern)
	{
		const newRank = rank + rankOffset;
		const newFile = file + fileOffset;
		
		//if it is in the board, include it
		if(Square.validRankAndFile(newRank,newFile))
		{
			const newSquare = Square.make(newRank,newFile);
			squaresArray.push(newSquare);
			squaresBits.interact(BitVector.SET, newSquare);
		}
	}
	
	return [squaresArray, squaresBits];
}

//for patterns that extend as far as possible in directions from a starting square
function squaresAndBitsInDirectionsFromSquareInGame(directions, square, game)
{
	const squaresArray = [];
	const squaresBits = new BitVector();
	
	const squaresOccupiedBitVector = game.squaresOccupiedBitVector;
	
	const rank = Square.rank(square);
	const file = Square.file(square);
	
	for(const [rankOffset,fileOffset] of directions)
	{
		let newRank = rank+rankOffset;
		let newFile = file+fileOffset;
		let blocked = false;
		
		//keep stepping further in the given direction until reaching the edge of the board or another piece
		while(Square.validRankAndFile(newRank,newFile) && !blocked)
		{
			const newSquare = Square.make(newRank,newFile);
			
			//checking if the way is blocked AFTER adding the potentially blocked square is important
			//e.g. capturing a piece necessarily involves being able to move to the square that is blocked
			squaresArray.push(newSquare);
			squaresBits.interact(BitVector.SET, newSquare);
			
			blocked = squaresOccupiedBitVector.interact(BitVector.READ, newSquare);
			newRank += rankOffset;
			newFile += fileOffset;
		}
	}
	return [squaresArray,squaresBits];
}

function imageFileName(teamName, pieceName)
{
	return `./images/chess/${teamName}/${pieceName}.png`;
}

class Piece
{
	static typeChar;
	static points;
	static name;
	
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
	moved;
	
	kingSeer;
	reachableSquares;
	reachableBits;
	
	image;
	
	//set by the piece's team
	id;
	
	constructor(game, team, square, moved)
	{
		this.game = game;
		this.team = team;
		this.square = square;
		this.moved = false;
		
		this.kingSeer = new Manager(0);
		this.reachableSquares = new Manager([]);
		this.reachableBits = new Manager(new BitVector());
		
		this.image = Canvas.loadImage(imageFileName(this.team.constructor.name, this.constructor.name));
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
		
		//reflect the change in whether this piece sees the king in its team
		const oldKingSeer = this.kingSeer.get();
		this.kingSeer.update(this.reachableBits.get().interact(BitVector.READ, this.team.opposition.king.square));
		const currentKingSeer = this.kingSeer.get();
		this.team.numKingSeers += currentKingSeer - oldKingSeer;
	}
	
	revertReachableSquaresAndBitsAndKingSeer()
	{
		this.reachableSquares.revert();
		this.reachableBits.revert();
		
		//reflect the change in whether this piece sees the king in its team
		const oldKingSeer = this.kingSeer.get();
		this.kingSeer.revert();
		const currentKingSeer = this.kingSeer.get();
		this.team.numKingSeers += currentKingSeer - oldKingSeer;
	}
	
	toString()
	{
		return `${this.team.constructor.charConverter(this.constructor.typeChar)}`;
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
}

const pieceClassesArray = [

	class King extends PatternPiece
	{
		static typeChar = "K";
		static name = "king";
		static points = 0;
		
		static pattern = [
			[-1,-1],
			[0,-1],
			[1,-1],
			[-1,0],
			[1,0],
			[-1,1],
			[0,1],
			[1,1]
		];
	},

	class Knight extends PatternPiece
	{
		static typeChar = "N";
		static name = "knight";
		static points = 3;
		
		static pattern = [
			[-2,-1],
			[-2,1],
			[-1,-2],
			[-1,2],
			[1,-2],
			[1,2],
			[2,-1],
			[2,1]
		];
	},

	class Bishop extends DirectionPiece
	{
		static typeChar = "B";
		static name = "bishop";
		static points = 3;
		
		static directions = [
			[-1,-1],
			[1,-1],
			[-1,1],
			[1,1]
		];
	},

	class Rook extends DirectionPiece
	{
		static typeChar = "R";
		static name = "rook";
		static points = 5;
		
		static directions = [
			[0,-1],
			[-1,0],
			[1,0],
			[0,1]
		];
	},

	class Queen extends DirectionPiece
	{
		static typeChar = "Q";
		static name = "queen";
		static points = 9;
		
		static directions = [
			[-1,-1],
			[0,-1],
			[1,-1],
			[-1,0],
			[1,0],
			[-1,1],
			[0,1],
			[1,1]
		];
	},
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