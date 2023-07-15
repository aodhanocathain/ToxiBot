const {Square} = require("./Square.js");

class Move
{
	before;
	after;
	
	movingPiece;
	
	discordString;
	
	//required to undo the move
	targetPiece;
	firstMove;
	enPassantable;
	castleRights;
	
	constructor(game, before, after)
	{
		this.game = game;
		
		this.before = before;
		this.after = after;
		
		this.movingPiece = game.pieces[before];
		this.targetPiece = game.pieces[after];
		this.firstMove = (this.movingPiece.moved == false);
		this.enPassantable = game.enPassantable;
		this.castleRights = game.castleRights;
	}
	
	generateString()
	{
		this.discordString = this.toString();
	}
	
	toString()
	{
		/*
		If many pieces of the same type can move to the same square, must also include
		information about the square the piece moves from, to uniquely identify the moving piece.
		*/
		
		//Search for any pieces of this move's piece type, that could also move to the same square
		//See what squares the piece could have come from at the destination
		//(this is the same as the new destinations the piece has available from the move destination)
		
		let otherOrigins = this.movingPiece.constructor.findReachableSquaresAndBitsFromSquareInGame(this.after,this.game)[0]
		.filter((square)=>{
			const otherPiece = this.game.pieces[square];
			//ignore the square the moving piece came from
			return (square != this.before) &&
			//piece teams must match
			(otherPiece?.team == this.movingPiece.team) &&
			//piece types must match
			(otherPiece?.constructor == this.movingPiece.constructor);
		})
		
		const sameOriginFiles = otherOrigins.filter((square)=>{return Square.file(this.before)==Square.file(square);});
		const sameOriginRanks = otherOrigins.filter((square)=>{return Square.rank(this.before)==Square.rank(square);});
		
		const beforeDetails = 
		(otherOrigins.length==0)?	//piece is the only possible candidate for the move
		"":
		(sameOriginFiles.length==0)?	//can uniquely identify piece by its file
		Square.fileString(this.before) :
		(sameOriginRanks.length==0)?	//can uniquely identify piece by its rank
		Square.rankString(this.before) :
		//have to fully specify the square the piece starts on
		Square.fullString(this.before);
		
		const capture = this.targetPiece? "x" : "";
		
		this.game.makeMove(this);
		const checkStatus = this.game.isCheckmate()? "#" : this.game.kingChecked()? "+" : "";
		this.game.undoMove();
		
		return `${this.movingPiece.constructor.typeChar}${beforeDetails}${capture}${Square.fullString(this.after)}${checkStatus}`;
	}
}

class PlainMove extends Move
{
}

module.exports = {
	PlainMove:PlainMove
}