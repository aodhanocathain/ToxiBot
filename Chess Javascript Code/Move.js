const {Square} = require("./Square.js");

class Move
{
	//squares pertaining to the main piece of the move
	mainPieceSquareBefore;	//the square the piece started at
	mainPieceSquareAfter;	//the square the piece ended at
	
	string;
	
	constructor(mainPieceSquareBefore, mainPieceSquareAfter)
	{		
		this.mainPieceSquareBefore = mainPieceSquareBefore;
		this.mainPieceSquareAfter = mainPieceSquareAfter;
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
}

class CastleMove extends Move
{
	rookBefore;
	rookAfter;

	constructor(kingBefore, kingAfter, rookBefore, rookAfter)
	{
		super(kingBefore, kingAfter);
		this.rookBefore = rookBefore;
		this.rookAfter = rookAfter;
	}
	
	generateString()
	{
		this.string = (Square.file(this.mainPieceSquareBefore) > Square.file(this.mainPieceSquareAfter))? "O-O-O" : "O-O";
	}
}

class EnPassantMove extends Move
{
	enPassantSquare;
	constructor(pawnBefore, pawnAfter, enPassantSquare)
	{
		super(pawnBefore, pawnAfter);
		this.enPassantSquare = enPassantSquare;
	}
}

class PromotionMove extends Move
{
	promotionPiece;
	constructor(mainPieceSquareBefore, mainPieceSquareAfter, promotionPiece)
	{
		super(mainPieceSquareBefore, mainPieceSquareAfter);
		this.promotionPiece = promotionPiece;
	}
}

module.exports = {
	PlainMove:PlainMove,
	CastleMove:CastleMove,
	EnPassantMove:EnPassantMove,
	PromotionMove:PromotionMove
}