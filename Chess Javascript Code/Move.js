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
	
	//The same move can generate different strings depending on the game position
	//Can use this method to capture the string at a specific moment
	takeStringSnapshot()
	{
		this.string = this.toString();
	}
	
	toString()
	{
		/*
		If many pieces of the same type can move to the same square, must also include
		information about the square the piece moves from, to uniquely identify the moving piece.
		*/
		
		//See what squares the piece could have come from at the new square
		const movingPiece = this.game.pieces[this.before];
		const targetPiece = this.game.pieces[this.after];
		
		let otherOrigins = movingPiece.constructor.findReachableSquaresAndBitsFromSquareInGame(this.after,this.game)[0]
		.filter((otherOrigin)=>{
			const otherPiece = this.game.pieces[otherOrigin];
			//ignore the square the moving piece came from
			if(movingPiece==otherPiece){return false;}
			//piece teams must match
			if(movingPiece.team!=otherPiece?.team){return false;}
			//piece types must match
			if(movingPiece.constructor!=otherPiece?.constructor){return false;}
			
			return true;
		})
		
		const sameOriginFiles = otherOrigins.filter((square)=>{return Square.file(this.before)==Square.file(square);});
		const sameOriginRanks = otherOrigins.filter((square)=>{return Square.rank(this.before)==Square.rank(square);});
		
		const beforeDetails = 
		(otherOrigins.length==0)?	//piece is the only possible candidate for the move, needs no clarification
		"":
		(sameOriginFiles.length==0)?	//need to uniquely identify piece by its file
		Square.fileString(this.before) :
		(sameOriginRanks.length==0)?	//need to uniquely identify piece by its rank
		Square.rankString(this.before) :
		//must fully specify the square the piece starts on
		Square.fullString(this.before);
		
		const capture = targetPiece? "x" : "";
		
		this.game.makeMove(this);
		const checkStatus = 
		this.game.isCheckmate()? "#":
		this.game.kingChecked()? "+":
		"";
		this.game.undoMove();
		
		return `${movingPiece.constructor.typeChar}${beforeDetails}${capture}${Square.fullString(this.after)}${checkStatus}`;
	}
}

class PlainMove extends Move
{
}

module.exports = {
	PlainMove:PlainMove
}