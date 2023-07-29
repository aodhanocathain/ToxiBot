const {Square} = require("./Square.js");

class Move
{
	game;
	before;	//the square a piece started at before the move
	after;	//the square the same piece ended at after the move
	
	string;
	
	constructor(game, before, after)
	{
		this.game = game;
		
		this.before = before;
		this.after = after;
	}
	
	//store the string, which varies with the game position, at a specific moment in the game
	takeStringSnapshot()
	{
		this.string = this.game.pieces[this.before].constructor.makeMoveString(this);
	}
	
	toString()
	{
		return this.string ?? `${Square.fullString(this.before)}->${Square.fullString(this.after)}`;
	}
}

class PlainMove extends Move
{
	
}

class CastleMove extends Move
{
	rookBefore;
	rookAfter;
	
	constructor(game, kingBefore, kingAfter, rookBefore, rookAfter)
	{
		super(game, kingBefore, kingAfter);
		this.rookBefore = rookBefore;
		this.rookAfter = rookAfter;
	}
	
	toString()
	{
		if(Square.file(this.before) > Square.file(this.after))
		{
			return "O-O-O";
		}
		else
		{
			return "O-O";
		}
	}
}

class EnPassantMove extends Move
{
	captureSquare;
	constructor(game, moveBefore, moveAfter, captureSquare)
	{
		super(game, moveBefore, moveAfter);
		this.captureSquare = captureSquare;
	}
}

module.exports = {
	PlainMove:PlainMove,
	CastleMove:CastleMove,
	EnPassantMove:EnPassantMove
}