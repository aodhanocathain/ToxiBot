const {Piece, DirectionPiece} = require("./Piece.js");
const {MIN_RANK, MIN_FILE} = require("./Constants.js");

class Move
{
	mainTransition;
	
	firstMove;
	targetPiece;
	
	castleRights;
	enPassantable;
	
	constructor(mainTransition)
	{
		this.mainTransition = mainTransition;
		
		//most of this is required for undoing the move
		this.firstMove = (this.mainTransition.before.moved == false);
		this.targetPiece = this.mainTransition.after.piece;
		
		const game = this.mainTransition.before.game;
		this.castleRights = game.castleRights.slice();	//.slice() to copy the castle rights
		this.enPassantable = game.enPassantable;
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
		const movingPiece = this.mainTransition.before.piece;
		const game = this.mainTransition.before.game;
		
		let otherOrigins = movingPiece.constructor.findReachableSquaresFromSquare(this.mainTransition.after)
		.filter((square)=>{
			//ignore the square the moving piece came from
			return (square != this.mainTransition.before) &&
			//piece teams must match
			(square.piece?.team == movingPiece.team) &&
			//piece types must match
			(square.piece?.constructor == movingPiece.constructor);
		})
		
		const sameOriginFiles = otherOrigins.filter((square)=>{return square.file==this.mainTransition.before.file});
		const sameOriginRanks = otherOrigins.filter((square)=>{return square.rank==this.mainTransition.before.rank});
		
		const beforeDetails = 
		(otherOrigins.length==0)?	//piece is the only possible candidate for the move
		"":
		(sameOriginFiles.length==0)?	//can uniquely identify piece by its file
		this.mainTransition.before.fileString() :
		(sameOriginRanks.length==0)?	//can uniquely identify piece by its rank
		this.mainTransition.before.rankString() :
		//have to fully specify the square the piece starts on
		this.mainTransition.before.toString();
		
		const capture = this.targetPiece? "x" : "";
		
		const checkStatus = (()=>{
			return game.conditionAfterTempMove(this, function(game, move){
				return game.isCheckmate()? "#" : game.kingChecked()? "+" : "";
			});
		})();
		
		return `${movingPiece.constructor.typeChar}${beforeDetails}${capture}${this.mainTransition.after.toString()}${checkStatus}`;
	}
}

class PlainMove extends Move
{
	constructor(mainTransition)
	{
		super(mainTransition);
	}
}

module.exports = {
	PlainMove:PlainMove
}