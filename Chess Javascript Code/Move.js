const {Piece, DirectionPiece} = require("./Piece.js");
const {MIN_RANK, MIN_FILE} = require("./Constants.js");

class Move
{
	before;
	after;
	
	firstMove;
	targetPiece;
	
	constructor(before, after)
	{
		this.before = before;
		this.after = after;
		
		//most of this is required for undoing the move
		this.firstMove = (this.before.moved == false);
		this.targetPiece = this.after.piece;
	}
	
	toString()
	{
		/*
		If many pieces of the same type can move to the same square, must also include
		information about the square the piece moves from, to uniquely identify the moving piece.
		*/
		
		//search for any pieces of this move's piece type, that could also move to the same square
		//see what squares the piece could have come from at the destination
		//this is the same as the new destinations the piece has available from the move destination
		const movingPiece = this.before.piece;
		const game = this.before.game;
		
		let otherOrigins = movingPiece.constructor.findReachableSquaresFromSquare(this.after)
		.filter((square)=>{
			//ignore the square the moving piece came from
			return (square != this.before) &&
			//piece teams must match
			(square.piece?.team == movingPiece.team) &&
			//piece types must match
			(square.piece?.constructor == movingPiece.constructor);
		})
		
		const sameOriginFiles = otherOrigins.filter((square)=>{return square.file==this.before.file});
		const sameOriginRanks = otherOrigins.filter((square)=>{return square.rank==this.before.rank});
		
		const beforeDetails = 
		(otherOrigins.length==0)?	//piece is the only possible candidate for the move
		"":
		(sameOriginFiles.length==0)?	//can uniquely identify piece by its file
		this.before.fileString() :
		(sameOriginRanks.length==0)?	//can uniquely identify piece by its rank
		this.before.rankString() :
		//have to fully specify the square the piece starts on
		this.before.toString();
		
		const capture = this.targetPiece? "x" : "";
		
		game.makeMoveWithConditionalLegalsUpdate(this, false);
		const checkStatus = game.isCheckmate()? "#" : game.kingChecked()? "+" : "";
		game.undoMoveWithConditionalLegalsUpdate(false);
		
		return `${movingPiece.constructor.typeChar}${beforeDetails}${capture}${this.after.toString()}${checkStatus}`;
	}
}

class PlainMove extends Move
{
	constructor(before, after)
	{
		super(before, after);
	}
}

module.exports = {
	PlainMove:PlainMove
}