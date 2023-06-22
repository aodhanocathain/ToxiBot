const {NUM_RANKS, NUM_FILES} = require("./Constants.js");
const {WHITE_TEAM, BLACK_TEAM, Team} = require("./Team.js");
const {Offset} = require("./Offset.js");
const {Direction} = require("./Direction.js");

const Canvas = require("canvas");

//for patterns that depend only on set offsets from a starting square
function specificOffsettedSquares(square, offsets)
{
	return offsets.map((offset)=>{return square.offset(offset);})
	.filter((square)=>{return square.valid;});
}

//the king's pattern depends only on these offsets from its current square
const kingOffsets = [
	new Offset(-1,-1),
	new Offset(-1,0),
	new Offset(-1,1),
	new Offset(0,1),
	new Offset(0,-1),
	new Offset(1,-1),
	new Offset(1,0),
	new Offset(1,1)
];

//the knight's pattern depends only on these offsets from its current square
const knightOffsets = [
	new Offset(-2,-1),
	new Offset(-2,1),
	new Offset(-1,-2),
	new Offset(-1,2),
	new Offset(1,-2),
	new Offset(1,2),
	new Offset(2,-1),
	new Offset(2,1)
];

const maxDirectionLength = Math.max(NUM_RANKS-1, NUM_FILES-1);
//for patterns that extend as far as possible in directions from a starting square
function directionOffsettedSquares(square, game, directions)
{
	return directions.map((direction)=>{
	const maxRange = Array(maxDirectionLength).fill(null).map((item, index)=>{
		const rankOffset = (direction.rankCoefficient * (index+1));
		const fileOffset = (direction.fileCoefficient * (index+1));
		const offset = new Offset(rankOffset, fileOffset);
		return square.offset(offset);
	})
	.filter((square)=>{return square.valid;});
	
	//the piece has to stop at the first piece it can see
	let blockedSquareIndex = maxRange.findIndex((square)=>{
		return game.board[square.rank][square.file] instanceof Piece;
	});
	if(blockedSquareIndex<0){return maxRange;}
	
	//the point of this function is to find squares that would be targetted
	//by a specific pattern, not to check whether captures are possible on those squares
	//therefore the blocked square is included in the range as a target, assuming possible capture
	return maxRange.slice(0, blockedSquareIndex+1);
	})
	.flat(1);
}

const bishopDirections = [
	new Direction(1,1),	//up and right
	new Direction(1,-1),	//up and left
	new Direction(-1,1),	//down and right
	new Direction(-1,-1)	//down and left
];

const rookDirections = [
	new Direction(1,0),	//up
	new Direction(-1,0),	//down
	new Direction(0,1),	//right
	new Direction(0,-1)	//left
];

class Piece
{
	team;
	image;
	moved;
	
	static typeChar;
	
	constructor(team)
	{
		this.team = team;
	}
	
	is(piece)
	{
		return (this.constructor == piece.constructor) && (this.team == piece.team);
	}
	
	static typeOfTeamedChar(teamedChar)
	{
		return teamedChar.toUpperCase();	//maps teamed chars to teamless chars (which only show the type)
	}
	
	static fromTeamedChar(teamedChar)
	{
		const typeChar = Piece.typeOfTeamedChar(teamedChar);
		const team = Team.ofTeamedChar(teamedChar);
		const pieceClass = pieceClassesObject[typeChar];
		return new pieceClass(team);
	}
	
	static getDestinations(square, game)
	{
		throw "Piece.getDestinations must be implemented";
	}
	
	toString()
	{
		return `${this.team.charConverter(this.constructor.typeChar)}`;
	}
}

function pieceImageDirectory(team)
{
	return `./images/chess/${team==WHITE_TEAM? "white":"black"}`;
}

const pieceClassesArray = [

	class King extends Piece
	{
		static typeChar = "K";
		
		constructor(team)
		{
			super(team);
			this.image = Canvas.loadImage(`${pieceImageDirectory(team)}/king.png`);
		}
		
		static getDestinations(square, game)
		{
			return specificOffsettedSquares(square, kingOffsets);
		}
	},

	class Knight extends Piece
	{
		static typeChar = "N";
		
		constructor(team)
		{
			super(team);
			this.image = Canvas.loadImage(`${pieceImageDirectory(team)}/knight.png`);
		}
		
		static getDestinations(square, game)
		{
			return specificOffsettedSquares(square, knightOffsets);
		}
	},

	class Bishop extends Piece
	{
		static typeChar = "B";
		
		constructor(team)
		{
			super(team);
			this.image = Canvas.loadImage(`${pieceImageDirectory(team)}/bishop.png`);
		}
		
		static getDestinations(square, game)
		{
			return directionOffsettedSquares(square, game, bishopDirections);
		}
	},

	class Rook extends Piece
	{
		static typeChar = "R";
		
		constructor(team)
		{
			super(team);
			this.image = Canvas.loadImage(`${pieceImageDirectory(team)}/rook.png`);
		}
		
		static getDestinations(square, game)
		{
			return directionOffsettedSquares(square, game, rookDirections);
		}
	},

	class Queen extends Piece
	{
		static typeChar = "Q";
		
		constructor(team)
		{
			super(team);
			this.image = Canvas.loadImage(`${pieceImageDirectory(team)}/queen.png`);
		}
		
		static getDestinations(square, game)
		{
			//the queen can move like a rook and like a bishop
			return directionOffsettedSquares(square, game, rookDirections)
			.concat(directionOffsettedSquares(square, game, bishopDirections));
		}
	}
];

//match piece type characters to classes
const pieceClassesObject = pieceClassesArray.reduce((accumulator, pieceClass)=>{
	accumulator[pieceClass.typeChar] = pieceClass;
	return accumulator;
}, {});

module.exports = {
	Piece:Piece,
	
	PieceClassesArray: pieceClassesArray,
	
	PieceClassesObject: pieceClassesObject,
}