const {Square} = require("./Square.js");

class Move
{
	game;
	
	//squares pertaining to the main piece of the move
	mainPieceSquareBefore;	//the square the piece started at
	mainPieceSquareAfter;	//the square the piece ended at
	captureTargetSquare;	//the square a capture targetted (not the same as mainPieceSquareAfter for en passant captures)
	
	otherPiece;	//a promotion piece, or a castling rook
	//squares pertaining to otherPiece
	otherPieceSquareBefore;
	otherPieceSquareAfter;
	
	string;
	
	constructor(game, mainPieceSquareBefore, mainPieceSquareAfter, captureTargetSquare, otherPiece, otherPieceSquareBefore, otherPieceSquareAfter)
	{
		this.game = game;
		
		this.mainPieceSquareBefore = mainPieceSquareBefore;
		this.mainPieceSquareAfter = mainPieceSquareAfter;
		this.captureTargetSquare = captureTargetSquare;
		this.otherPiece = otherPiece;
		this.otherPieceSquareBefore = otherPieceSquareBefore;
		this.otherPieceSquareAfter = otherPieceSquareAfter;
	}
	
	//store the string, which varies with the game position, at a specific moment in the game
	takeStringSnapshot()
	{
		const copyGame = this.game.clone();
		this.string = this.game.pieces[this.mainPieceSquareBefore].constructor.makeMoveString(this);
	}
	
	toString()
	{
		return this.string ?? `${Square.fullString(this.mainPieceSquareBefore)}->${Square.fullString(this.mainPieceSquareAfter)}`;
	}
	
	pieceEndSquare()
	{
		return this.mainPieceSquareAfter || this.otherPieceSquareAfter;
	}
}

class PlainMove extends Move
{
	constructor(game, mainPieceSquareBefore, mainPieceSquareAfter)
	{
		super(game, mainPieceSquareBefore, mainPieceSquareAfter, mainPieceSquareAfter, null, null, null);
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
		this.string = (Square.file(this.mainPieceSquareBefore) > Square.file(this.mainPieceSquareAfter))? "O-O-O" : "O-O";
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
	constructor(game, mainPieceSquareBefore, mainPieceSquareAfter, promotionPiece)
	{
		super(game, mainPieceSquareBefore, mainPieceSquareAfter, mainPieceSquareAfter, promotionPiece, mainPieceSquareBefore, mainPieceSquareAfter)
	}
}

module.exports = {
	PlainMove:PlainMove,
	CastleMove:CastleMove,
	EnPassantMove:EnPassantMove,
	PromotionMove:PromotionMove
}