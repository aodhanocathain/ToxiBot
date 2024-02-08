const {Square} = require("./Square.js");

class Move
{
	//squares pertaining to the main piece of the move
	mainPieceSquareBefore;	//the square the piece started at
	mainPieceSquareAfter;	//the square the piece ended at
	captureTargetSquare;	//the square a capture targetted (not the same as mainPieceSquareAfter for en passant captures)
	
	otherPiece;	//a promotion piece, or a castling rook
	//squares pertaining to otherPiece
	otherPieceSquareBefore;
	otherPieceSquareAfter;
	
	string;
	
	constructor(mainPieceSquareBefore, mainPieceSquareAfter, captureTargetSquare, otherPiece, otherPieceSquareBefore, otherPieceSquareAfter)
	{		
		this.mainPieceSquareBefore = mainPieceSquareBefore;
		this.mainPieceSquareAfter = mainPieceSquareAfter;
		this.captureTargetSquare = captureTargetSquare;
		this.otherPiece = otherPiece;
		this.otherPieceSquareBefore = otherPieceSquareBefore;
		this.otherPieceSquareAfter = otherPieceSquareAfter;
	}
	
	//a move involving the same squares could have a different string representation across different positions
	//this function generates the move's string for the current position
	generateString(game)
	{
		this.string = game.pieces[this.mainPieceSquareBefore].constructor.makeMoveString(this, game);
	}
	
	toString(game)
	{
		//if the string did not already exist, generate it on the spot
		return this.string ?? ((move)=>{move.generateString(game); return move.string;})(this);
	}
}

class PlainMove extends Move
{
	constructor(mainPieceSquareBefore, mainPieceSquareAfter)
	{
		super(mainPieceSquareBefore, mainPieceSquareAfter, mainPieceSquareAfter, null, null, null);
	}
}

class CastleMove extends Move
{
	constructor(kingBefore, kingAfter, rook, rookBefore, rookAfter)
	{
		super(kingBefore, kingAfter, null, rook, rookBefore, rookAfter);
	}
	
	generateString()
	{
		this.string = (Square.file(this.mainPieceSquareBefore) > Square.file(this.mainPieceSquareAfter))? "O-O-O" : "O-O";
	}
}

class EnPassantMove extends Move
{
	constructor(moveBefore, moveAfter, captureSquare)
	{
		super(moveBefore, moveAfter, captureSquare, null, null, null)
	}
}

class PromotionMove extends Move
{
	constructor(mainPieceSquareBefore, mainPieceSquareAfter, promotionPiece)
	{
		super(mainPieceSquareBefore, null, mainPieceSquareAfter, promotionPiece, null, mainPieceSquareAfter)
	}
}

module.exports = {
	PlainMove:PlainMove,
	CastleMove:CastleMove,
	EnPassantMove:EnPassantMove,
	PromotionMove:PromotionMove
}