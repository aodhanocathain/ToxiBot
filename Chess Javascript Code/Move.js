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
	
	//a move involving the same squares could have a different string representation across different positions
	//this function generates the move's string for the current position
	generateString()
	{
		const copyGame = this.game.clone();
		this.string = this.game.pieces[this.mainPieceSquareBefore].constructor.makeMoveString(this);
	}
	
	toString()
	{
		//if the string did not already exist, generate it on the spot
		return this.string ?? ((move)=>{move.generateString(); return move.string;})(this);
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
	
	generateString()
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