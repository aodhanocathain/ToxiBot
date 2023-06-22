const {Piece} = require("./Piece.js");
const {MIN_RANK, MIN_FILE} = require("./Constants.js");

class Transition
{
	before;
	after;
	
	constructor(before, after)
	{
		this.before = before;
		this.after = after;
	}
	
	toString()
	{
		return `${this.before.toString()}->${this.after.toString()}`
	}
}

class Move
{
	mainTransition;
	game;
	
	firstMove;
	movingPiece;
	targetPiece;
	
	castleRights;
	enPassantable;
	
	string;
	
	constructor(mainTransition, game)
	{
		this.mainTransition = mainTransition;
		this.game = game;
		
		//most of this is required for undoing the move
		this.movingPiece = game.board[this.mainTransition.before.rank][this.mainTransition.before.file];
		this.firstMove = (this.movingPiece.moved == false);
		this.targetPiece = game.board[this.mainTransition.after.rank][this.mainTransition.after.file];
		
		this.castleRights = game.castleRights.slice();	//.slice() to copy the castle rights
		this.enPassantable = game.enPassantable;
	}
	
	toString()
	{
		return this.string ?? this.mainTransition.toString();
	}
	
	generateString()	//the same transition could produce different strings in different positions
	//by generating a string, the object stores the string that results from the current game position
	{
		/*
		If many pieces of the same type can move to the same square, must also include
		information about the square the piece moves from, to uniquely identify the moving piece.
		*/
		
		//search for any pieces of this move's piece type, that could also move to the same square
		//see what squares the piece could have come from at the destination
		//this is the same as the new destinations the piece has available from the move destination
		const otherOrigins = this.movingPiece.constructor.getDestinations(this.mainTransition.after, this.game)
		.filter((square)=>{
			const otherPiece = this.game.board[square.rank][square.file];
			//piece does not compete with itself for its square
			return (otherPiece != this.movingPiece) &&
			//piece teams must match
			(otherPiece?.team == this.movingPiece.team) &&
			//piece types must match
			(otherPiece?.constructor == this.movingPiece.constructor);
		})
		
		console.log(`otherOrigins of ${this.mainTransition.after.toString()} are ${otherOrigins}`);
		
		const sameOriginFiles = otherOrigins.filter((square)=>{return square.file==this.mainTransition.before.file}) ?? [];
		const sameOriginRanks = otherOrigins.filter((square)=>{return square.rank==this.mainTransition.before.rank}) ?? [];
		
		const beforeDetails = 
		(otherOrigins.length==0)?	//piece is the only possible candidate for the move
		"":
		(sameOriginFiles.length==0)?	//can uniquely identify piece by its file
		this.mainTransition.before.fileString :
		(sameOriginRanks.length==0)?	//can uniquely identify piece by its rank
		this.mainTransition.before.rankString :
		//have to fully specify the square the piece starts on
		this.mainTransition.before.toString();
		
		const capture = this.targetPiece? "x" : "";
		
		const checkStatus = (()=>{
			return this.game.conditionAfterTempMove(this, function(game, move){
				return game.isCheckmate()? "#" : game.kingChecked()? "+" : "";
			});
		})();
		
		this.string = `${this.movingPiece.constructor.typeChar}${beforeDetails}${capture}${this.mainTransition.after.toString()}${checkStatus}`;
	}
}

class PlainMove extends Move
{
	constructor(mainTransition, game)
	{
		super(mainTransition, game);
	}
}

module.exports = {
	Transition:Transition,
	PlainMove:PlainMove
}