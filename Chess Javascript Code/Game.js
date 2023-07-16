const {Team, TeamClassesArray} = require("./Team.js");
const [WhiteTeam, BlackTeam] = TeamClassesArray;

const {Piece, PatternPiece, DirectionPiece, PieceTypeCharClasses, PieceClassesArray} = require("./Piece.js");
const [King] = PieceClassesArray;

const {NUM_RANKS, NUM_FILES} = require("./Constants.js");
const {PlainMove} = require("./Move.js");
const {BitVector} = require("./BitVector.js");
const {Square} = require("./Square.js");
const {Manager} = require("./Manager.js");

const Canvas = require("canvas");

const DEFAULT_FEN_STRING = "rnbqkbnr/8/8/8/8/8/8/RNBQKBNR w KQkq - 0 1";

class Game
{
	pieces;	//indexed by a square on the board
	squaresOccupiedBitVector;	//indicates whether a square is occupied by a piece
	
	white;
	black;
	movingTeam;
	
	playedMoves;
	halfMove;
	fullMove;
	
	castleRights;
	enPassantable;
	movingPiece;
	targetPiece;
	firstMove;
	
	previouslyUpdatedPieces;
	
	constructor(FENString = DEFAULT_FEN_STRING)
	{
		this.squaresOccupiedBitVector = new BitVector();
		
		this.white = new WhiteTeam(this);
		this.black = new BlackTeam(this);
		this.white.opposition = this.black;
		this.black.opposition = this.white;
		
		//initialize an empty board
		this.pieces = Array(NUM_RANKS*NUM_FILES).fill(null);
		
		const FENparts = FENString.split(" ");
		//populate the board using the first part of the FEN string
		const boardString = FENparts[0];
		const rankStrings = boardString.split("/");	//ranks are delimitted by "/" in FEN strings
		rankStrings.reverse()	//ranks are in descending order in FEN strings, .reverse() for ascending order
		.forEach((rankString,rank)=>{
			let file=0;
			rankString.split("").forEach((character)=>{
				if(isNaN(character))	//character denotes a piece
				{
					const typeChar = Piece.typeCharOfTeamedChar(character);
					const pieceClass = PieceTypeCharClasses[typeChar];
					
					const teamChar = Team.charOfTeamedChar(character);
					const team = (teamChar == WhiteTeam.char)? this.white : this.black;
					
					const square = Square.make(rank,file);
					const piece = new pieceClass(this,team,square,false);	
					
					//current square is occupied
					this.pieces[square] = piece;
					this.squaresOccupiedBitVector.interact(BitVector.SET, square);
					
					team.addActivePiece(piece);
					
					file += 1;
				}
				else	//character denotes a number of empty squares
				{
					file += parseInt(character);
				}
			})
		})
		
		this.movingTeam = (FENparts[1] == WhiteTeam.char)? this.white : this.black;
		
		this.castleRights = new Manager(FENparts[2].split(""));
		this.enPassantable = new Manager(FENparts[3]);
		this.movingPiece = new Manager();
		this.targetPiece = new Manager();
		this.firstMove = new Manager();
		
		this.halfMove = parseInt(FENparts[4]);
		this.fullMove = parseInt(FENparts[5]);
		
		this.playedMoves = [];
		this.previouslyUpdatedPieces = new Manager([]);
		
		this.white.init();
		this.black.init();
	}
	
	changeTurns()
	{
		//the new moving team is the opposition of the old moving team
		this.movingTeam = this.movingTeam.opposition;
	}
	
	immediatePositionScore()
	{
		//loose heuristic for now
		return this.white.points - this.black.points;
	}
	
	isCheckmate()
	{
		//by definition
		return (this.calculateLegals().length == 0) && this.kingChecked();
	}

	isStalemate()
	{
		//by definition
		return (this.calculateLegals().length == 0) && !(this.kingChecked());
	}

	evaluate(depth = 2)
	{
		if(this.kingCapturable())
		{
			return {
				illegal:true
			}
		}
		if(depth==0)
		{
			return {
				score: this.immediatePositionScore(),
			}
		}
		else
		{
			const continuations = this.calculateMoves();
			const evalPreferredToEval = this.movingTeam.constructor.evalPreferredToEval;
			
			let bestContinuation;
			let bestEval;
			
			//check for better continuations
			for(let i=0; i<continuations.length; i++)
			{
				const newContinuation = continuations[i];
				this.makeMove(newContinuation);
				const newEval = this.evaluate(depth-1);
				this.undoMove();
				if(evalPreferredToEval(newEval,bestEval))
				{
					bestContinuation = newContinuation;
					bestEval = newEval;
				}
			}
			
			if(!bestEval)
			{
				return bestEval;
			}
			
			const reverseLine = bestEval.reverseLine ?? [];
			reverseLine.push(bestContinuation);
			
			return {
				score: bestEval.score,
				bestMove: bestContinuation,
				reverseLine: reverseLine
			};
		}
	}
	
	makeMove(move)
	{
		if(move instanceof PlainMove)
		{
			const movingPiece = this.pieces[move.before];
			const targetPiece = this.pieces[move.after];
			
			//move the moving piece
			movingPiece.square = move.after;
			//capture the target piece
			targetPiece?.deactivate();
			//manipulate the game position
			this.pieces[move.after] = movingPiece;
			this.squaresOccupiedBitVector.interact(BitVector.SET, move.after);
			this.pieces[move.before] = null;
			this.squaresOccupiedBitVector.interact(BitVector.CLEAR, move.before);
			
			//update the necessary information for undoing the move
			if(movingPiece instanceof King)
			{
				this.castleRights.update(
					//opponent retains castling rights, moving team forfeits castle rights
					this.castleRights.get().filter((wing)=>{
						return Team.charOfTeamedChar(wing) != movingPiece.team.constructor.char;
					})
				);
			}
			this.enPassantable.update("-");
			this.movingPiece.update(movingPiece);
			this.targetPiece.update(targetPiece);
			this.firstMove.update(movingPiece.moved==false);
			
			movingPiece.moved = true;
			
			//update the piece that moved and the opposition pieces that could be blocked or unblocked by the move
			const updatedPieces = [];
			
			movingPiece.updateReachableSquaresAndBitsAndKingSeer();
			updatedPieces.push(movingPiece);
			
			movingPiece.team.opposition.activePieces.forEach((piece)=>{
				if(piece instanceof DirectionPiece)
				{
					const reachableBits = piece.reachableBits.get();
					if
					(
						reachableBits.interact(BitVector.READ, move.before) ||
						reachableBits.interact(BitVector.READ, move.after)
					)
					{
						piece.updateReachableSquaresAndBitsAndKingSeer();
						updatedPieces.push(piece);
					}
				}
			});
			this.previouslyUpdatedPieces.update(updatedPieces);
		}
		
		this.playedMoves.push(move);
		this.progressMoveCounters();
		this.changeTurns();
	}
	
	undoMove()
	{
		const move = this.playedMoves.pop();
		if(move instanceof PlainMove)
		{
			const movingPiece = this.movingPiece.get();
			const targetPiece = this.targetPiece.get();
			
			//move the moving piece back where it came from
			movingPiece.square = move.before;
			//revoke the capture of the target piece
			targetPiece?.activate();
			//manipulate the game position
			this.pieces[move.before] = movingPiece;
			this.squaresOccupiedBitVector.interact(BitVector.SET, move.before);
			this.pieces[move.after] = targetPiece;
			if(!targetPiece){this.squaresOccupiedBitVector.interact(BitVector.CLEAR, move.after);}
			
			//revert the game state
			if(movingPiece instanceof King)
			{
				this.castleRights.revert();
			}
			this.enPassantable.revert();
			this.movingPiece.revert();
			this.targetPiece.revert();
			movingPiece.moved = (this.firstMove.get() == false);
			this.firstMove.revert();

			const updatedPieces = this.previouslyUpdatedPieces.get();
			for(const piece of updatedPieces)
			{
				piece.revertReachableSquaresAndBitsAndKingSeer();
			}
			this.previouslyUpdatedPieces.revert();			
		}
		
		this.regressMoveCounters();
		this.changeTurns();
	}
	
	calculateMoves()
	{
		const moves = [];
		
		this.movingTeam.activePieces.forEach((piece)=>{
			//get destination squares of current piece
			const currentSquare = piece.square;
			const reachableSquares = piece.reachableSquares.get();
			reachableSquares.forEach((reachableSquare)=>{
				//only allow moves that do not capture pieces from the same team
				if(this.pieces[reachableSquare]?.team != piece.team)
				{
					moves.push(new PlainMove(this, currentSquare, reachableSquare));
				}
			})
		});
		return moves;
	}
	
	calculateLegals()
	{
		//moves are illegal if they leave the team's king vulnerable to capture
		return this.calculateMoves().filter((move)=>{
			///*
			this.makeMove(move);
			const condition = !(this.kingCapturable());
			this.undoMove();
			return condition;
			//*/
		});
	}
	
	kingCapturable()
	{	
		return this.movingTeam.numKingSeers > 0;
	}
	
	kingChecked()
	{
		return this.movingTeam.opposition.numKingSeers > 0;
	}
	
	regressMoveCounters()
	{
		//if(this.halfMove==0){this.fullMove--;} halfMove=0 when undoing a white move, i.e. going back to the previous full turn
		this.fullMove -= 1-this.halfMove;
		
		this.halfMove = (this.halfMove + 1) % 2;
	}
	
	progressMoveCounters()
	{
		//if(this.halfMove==1){this.fullMove++;} halfMove=1 when black has just moved, meaning a full turn has complete
		this.fullMove += this.halfMove;
		
		this.halfMove = (this.halfMove + 1) % 2;
	}
	
	toString()	//specifically to a FEN string
	{
		//game stores ranks in ascending order, must reverse a copy for descending order in FEN string
		let descendingRankStrings = [];
		for(let rank=NUM_RANKS-1; rank>=0; rank--)
		{
			let rankString = ``;
			let emptySquares=0;
			for(let file=0; file<NUM_FILES; file++)
			{
				const square = Square.make(rank,file);
				const piece = this.pieces[square];
				if(piece)
				{
					if(emptySquares>0)
					{
						//denote how many empty squares separate pieces
						rankString = rankString.concat(`${emptySquares}`);
						emptySquares = 0;
					}
					rankString = rankString.concat(`${piece.toString()}`);
				}
				else
				{
					emptySquares++;
				}
			}
			if(emptySquares>0)
			{
				//denote how many empty squares separate the last piece in the rank and the end of the rank
				rankString = rankString.concat(`${emptySquares}`);
			}
			descendingRankStrings.push(rankString);
		}
		const boardString = descendingRankStrings.join("/");
		return [boardString, this.movingTeam.constructor.char, this.castleRights.get().join(""), this.enPassantable.get(), this.halfMove, this.fullMove].join(" ");
	}
	
	toPNGBuffer()
	{
		const LIGHT_COLOUR = "#e0d0b0";
		const DARK_COLOUR = "#e0a070";
		const FONT_COLOUR = "#0000ff";
		const WHITE_MOVE_COLOUR = "#ffff80";
		const BLACK_MOVE_COLOUR = "#80ffff";
		const SQUARE_PIXELS = 50;

		const canvas = Canvas.createCanvas(NUM_FILES*SQUARE_PIXELS, NUM_RANKS*SQUARE_PIXELS);
		const context = canvas.getContext("2d");

		context.font = `${SQUARE_PIXELS/5}px Arial`;//SQUARE_PIXELS/5 is an arbitrarily chosen size

		const drawCalls = [];

		const lastMove = this.playedMoves[this.playedMoves.length-1] ?? {};

		for(let rank=0; rank<NUM_RANKS; rank++)
		{
			for(let file=0; file<NUM_FILES; file++)
			{
				const square = Square.make(rank,file);
				//colour this square
				context.fillStyle = 
				//if the square was in the last move, highlight it
				((square==lastMove.before) || (square==lastMove.after))? 
					//highlight a different colour depending on the team that last moved
					((this.movingTeam==this.white)? BLACK_MOVE_COLOUR : WHITE_MOVE_COLOUR) :
				(((rank+file)%2) == 0) ?  DARK_COLOUR : LIGHT_COLOUR;
				const x = file*SQUARE_PIXELS;
				const y = ((NUM_RANKS-1)-rank)*SQUARE_PIXELS;
				context.fillRect(x, y, SQUARE_PIXELS, SQUARE_PIXELS);

				//draw a piece if one is present
				const piece = this.pieces[square];
				if(piece)
				{
					drawCalls.push(new Promise((resolve, reject)=>{
						piece.image.then((i)=>{
							context.drawImage(i, x, y, SQUARE_PIXELS, SQUARE_PIXELS);
							resolve("done");
						});
					}))
				}
				
				//annotate the square name e.g. "f3"
				context.fillStyle = FONT_COLOUR;
				context.fillText(Square.fullString(square), x, y+SQUARE_PIXELS);
			}
		}

		//make sure all pieces have been drawn
		return Promise.all(drawCalls).then(()=>{
			return canvas.toBuffer("image/png");
		});
	}
}

module.exports = {
	Game:Game
}