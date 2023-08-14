const {Square} = require("./Square.js");

class Move
{
	game;
	
	//squares pertaining to the main piece of the move
	mainBefore;	//the square the piece started at
	mainAfter;	//the square the piece ended at
	targetSquare;	//the square a capture targetted (not the same as mainAfter for en passant captures)
	
	otherPiece;	//a promotion piece, or a castling rook
	//squares pertaining to otherPiece
	otherBefore;
	otherAfter;
	
	string;
	
	constructor(game, mainBefore, mainAfter, targetSquare, otherPiece, otherBefore, otherAfter)
	{
		this.game = game;
		
		this.mainBefore = mainBefore;
		this.mainAfter = mainAfter;
		this.targetSquare = targetSquare;
		this.otherPiece = otherPiece;
		this.otherBefore = otherBefore;
		this.otherAfter = otherAfter;
	}
	
	//store the string, which varies with the game position, at a specific moment in the game
	takeStringSnapshot()
	{
		const copyGame = this.game.clone();
		this.string = this.game.pieces[this.mainBefore].constructor.makeMoveString(this);
	}
	
	toString()
	{
		return this.string ?? `${Square.fullString(this.mainBefore)}->${Square.fullString(this.mainAfter)}`;
	}
	
	pieceEndSquare()
	{
		return this.mainAfter || this.otherAfter;
	}
}

class PlainMove extends Move
{
	constructor(game, mainBefore, mainAfter)
	{
		super(game, mainBefore, mainAfter, mainAfter, null, null, null);
	}
}

class CastleMove extends Move
{
	constructor(game, kingBefore, kingAfter, rookBefore, rookAfter)
	{
		super(game, kingBefore, kingAfter, kingAfter, game.pieces[rookBefore], rookBefore, rookAfter);
	}
	
	takeStringSnapshot()
	{
		this.string = (Square.file(this.mainBefore) > Square.file(this.mainAfter))? "O-O-O" : "O-O";
	}
}

class EnPassantMove extends Move
{
	constructor(game, moveBefore, moveAfter, captureSquare)
	{
		super(game, moveBefore, moveAfter, captureSquare, null, null, null)
	}
}

class PromotionMove extends Move
{
	constructor(game, mainBefore, mainAfter, promotionPiece)
	{
		super(game, mainBefore, mainAfter, mainAfter, promotionPiece, mainBefore, mainAfter)
	}
}

module.exports = {
	PlainMove:PlainMove,
	CastleMove:CastleMove,
	EnPassantMove:EnPassantMove,
	PromotionMove:PromotionMove
}