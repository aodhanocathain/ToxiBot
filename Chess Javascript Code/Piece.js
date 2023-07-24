const {Manager} = require("./Manager.js");
const {Square} = require("./Square.js");
const {BitVector} = require("./BitVector.js");
const {PlainMove, CastleMove} = require("./Move.js");

const {NUM_RANKS, NUM_FILES} = require("./Constants.js");

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
	
	capturableBits;
	
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
		
		this.capturableBits = this.reachableBits;
		
		this.image = Canvas.loadImage(imageFileName(this.team.constructor.name, this.constructor.name));
	}
	
	activate()
	{
		this.team.activatePiece(this);
	}
	
	isActive()
	{
		return this.team.activePieces[this.id] == this;
	}
	
	deactivate()
	{
		this.team.deactivatePiece(this);
	}
	
	updateReachableSquaresAndBitsAndKingSeer()
	{
		const reachables = this.constructor.findReachableSquaresAndBitsFromSquareInGame(this.square, this.game);
		this.reachableSquares.update(reachables[0]);
		this.reachableBits.update(reachables[1]);
		
		this.updateKingSeer();
	}
	
	updateKingSeer()
	{
		//reflect the change in whether this piece sees the king in its team
		const oldKingSeer = this.kingSeer.get();
		this.kingSeer.update(this.capturableBits.get().interact(BitVector.READ, this.team.opposition.king.square));
		const currentKingSeer = this.kingSeer.get();
		this.team.numKingSeers += currentKingSeer - oldKingSeer;
	}
	
	revertReachableSquaresAndBitsAndKingSeer()
	{
		this.reachableSquares.revert();
		this.reachableBits.revert();
		
		this.revertKingSeer();
	}
	
	revertKingSeer()
	{
		//reflect the change in whether this piece sees the king in its team
		const oldKingSeer = this.kingSeer.get();
		this.kingSeer.revert();
		const currentKingSeer = this.kingSeer.get();
		this.team.numKingSeers += currentKingSeer - oldKingSeer;
	}
	
	addPlainMovesToArray(array)
	{
		this.reachableSquares.get().forEach((reachableSquare)=>{
			//only allow moves that do not capture pieces from the same team
			if(this.game.pieces[reachableSquare]?.team != this.team)
			{
				array.push(new PlainMove(this.game, this.square, reachableSquare));
			}
		});
	}
	
	addMovesToArray(array)
	{
		this.addPlainMovesToArray(array);
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
	
	addMovesToArray(array)
	{
		this.addPlainMovesToArray(array);
		//king must not have moved
		if(this.moved == false)
		{
			const backRank = this.team.constructor.BACK_RANK;
			const kingFile = Square.file(this.square);
			
			const kingRook = this.team.rooksInDefaultSquaresByStartingWingChar[King.typeChar];
			const queenRook = this.team.rooksInDefaultSquaresByStartingWingChar[Queen.typeChar];
			
			//rook must not have moved
			if((kingRook?.moved == false) && kingRook?.isActive())
			{
				let noPiecesBetween = true;
				for(let i=NUM_FILES-2; i>kingFile; i--)
				{
					noPiecesBetween = (!(this.game.squaresOccupiedBitVector.interact(BitVector.READ, Square.make(backRank, i)))) && noPiecesBetween;
				}
				//must not be any pieces between king and rook
				if(noPiecesBetween)
				{
					//can't castle to get out of check
					if(this.team.opposition.numKingSeers==0)
					{
						//can't castle through check
						const passingSquare = Square.make(backRank, 5);
						if(!(this.team.opposition.activePieces.some((piece)=>{
							return piece.reachableBits.get().interact(BitVector.READ, passingSquare);
						})))
						{
							array.push(new CastleMove(this.game, this.square, Square.make(backRank, 6), kingRook.square, Square.make(backRank,5)));
						}
					}
				}
			}
			//rook must not have moved
			if((queenRook?.moved == false) && queenRook?.isActive())
			{
				let noPiecesBetween = true;
				for(let i=1; i<kingFile; i++)
				{
					noPiecesBetween = (!(this.game.squaresOccupiedBitVector.interact(BitVector.READ, Square.make(backRank, i)))) && noPiecesBetween;
				}
				//must not be any pieces between king and rook
				if(noPiecesBetween)
				{
					//can't castle to get out of check
					if(this.team.opposition.numKingSeers==0)
					{
						//can't castle through check
						const passingSquare = Square.make(backRank, 3);
						if(!(this.team.opposition.activePieces.some((piece)=>{
							return piece.reachableBits.get().interact(BitVector.READ, passingSquare);
						})))
						{
							array.push(new CastleMove(this.game, this.square, Square.make(backRank, 2), kingRook.square, Square.make(backRank,3)));
						}
					}
				}
			}
		}
	}
}

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
}

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
}

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
}

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
}

const PieceClasses = [
	King,
	Queen,
	Rook,
	Bishop,
	Knight
];

//match piece type characters to classes
const PieceClassesByTypeChar = PieceClasses.reduce((accumulator, pieceClass)=>{
	accumulator[pieceClass.typeChar] = pieceClass;
	return accumulator;
}, {});

module.exports = {
	Piece:Piece,
	PatternPiece:PatternPiece,
	DirectionPiece:DirectionPiece,
	
	King:King,
	Queen:Queen,
	Rook:Rook,
	Bishop:Bishop,
	Knight:Knight,
	
	PieceClassesByTypeChar: PieceClassesByTypeChar,
}