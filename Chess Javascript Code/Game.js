const {Team, Team0, Team1, TEAM_CLASSES} = require("./Team.js");

const {Piece, PatternPiece, DirectionPiece, PieceClassesByTypeChar, PieceClasses} = require("./Piece.js");
const [King] = PieceClasses;

const {NUM_RANKS, NUM_FILES} = require("./Constants.js");
const {PlainMove} = require("./Move.js");
const {BitVector} = require("./BitVector.js");
const {Square} = require("./Square.js");
const {Manager} = require("./Manager.js");

const Canvas = require("canvas");

const DEFAULT_ANALYSIS_DEPTH = 3;

class Game
{	
	static DEFAULT_FEN_STRING = "rnbqkbnr/8/8/8/8/8/8/RNBQKBNR w KQkq - 0 1";
	//static DEFAULT_FEN_STRING = "k7/8/K7/Q7/8/8/8/8 w KQkq - 0 1";
	//static DEFAULT_FEN_STRING = "k7/8/K7/3Q4/8/8/8/8 b KQkq - 0 1";
	//static DEFAULT_FEN_STRING = "3k4/5Q2/K7/8/8/8/8/8 b - - 0 1";
	
	pieces;	//indexed by a square on the board
	squaresOccupiedBitVector;	//indicates whether a square is occupied by a piece
	
	teamsByName;
	movingTeam;
	
	playedMoves;
	halfMove;
	fullMove;
	
	castleRights;
	enPassantable;
	movingPiece;
	targetPiece;
	firstMove;
	
	static validFENString(FENString)
	{
		return true;
	}
	
	constructor(FENString)
	{
		this.squaresOccupiedBitVector = new BitVector();
		
		this.teamsByName = TEAM_CLASSES.reduce((accumulator, teamClass, index)=>{
			accumulator[teamClass.name] = new teamClass(this);
			return accumulator;
		}, {});
		
		Object.values(this.teamsByName).forEach((team)=>{
			//each team's opposition is not the team's own class
			team.opposition = this.teamsByName[TEAM_CLASSES.find((teamClass)=>{
				return !(team instanceof teamClass);
			}).name];
		});
		
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
					const pieceClass = PieceClassesByTypeChar[typeChar];
					
					const teamClass = Team.classOfTeamedChar(character);
					const team = this.teamsByName[teamClass.name];
					
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
		
		Object.values(this.teamsByName).forEach((team)=>{team.init();});
		
		this.movingTeam = Object.values(this.teamsByName).find((team)=>{return team.constructor.char == FENparts[1];});
		
		this.castleRights = new Manager(FENparts[2]=="-"? [] : FENparts[2].split(""));
		this.enPassantable = new Manager(FENparts[3]);
		this.movingPiece = new Manager();
		this.targetPiece = new Manager();
		this.firstMove = new Manager();
		
		this.halfMove = parseInt(FENparts[4]);
		this.fullMove = parseInt(FENparts[5]);
		
		this.playedMoves = [];
		
		Object.values(this.teamsByName).forEach((team)=>{team.init();});
	}
	
	changeTurns()
	{
		//the new moving team is the opposition of the old moving team
		this.movingTeam = this.movingTeam.opposition;
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

	///*
	
	evaluate(depth = DEFAULT_ANALYSIS_DEPTH)
	{
		if(this.movingTeam.numKingSeers>0){return;}
		if(depth==0){
			return {
				score: this.teamsByName[Team0.name].points - this.teamsByName[Team1.name].points
			}
		}
		const continuations = this.calculateMoves();
		
		let bestContinuation;
		let bestEval;
		
		//check for better continuations
		for(let i=0; i<continuations.length; i++)
		{
			//if(depth==DEFAULT_ANALYSIS_DEPTH){console.log(`${i}/${continuations.length}`)}
			const newContinuation = continuations[i];
			this.makeMoveForSearchExpansion(newContinuation);
			const newEval = this.evaluate(depth-1);
			this.undoMoveForSearchExpansion();
			if(this.movingTeam.evalPreferredToEval(newEval,bestEval))
			{
				bestContinuation = newContinuation;
				bestEval = newEval;
			}
		}
		
		if(!bestEval)
		{
			//No VALID continuation found, i.e. can't make a move without leaving king vulnerable.
			//This means the current position is either checkmate or stalemate.
			//The move functions specific to search expansion do not guarantee up to date opposition,
			//so must update the opposition, check if king vulnerable (checkmate vs stalemate),
			//then revert opposition to leave them as they were found
			
			//Can selectively update pieces that need it, or update every piece regardless
			//Either approach seems to be as fast as the other
			const lastMove = this.playedMoves[this.playedMoves.length-1];
			const lastLastMove = this.playedMoves[this.playedMoves.length-2] ?? lastMove;
			if(!this.playedMoves.length==0)
			{
				/*	//update selectively
				this.movingTeam.opposition.activePieces.forEach((piece)=>{
					if(piece instanceof DirectionPiece)
					{
						const reachableBits = piece.reachableBits.get();
						if
						(
							reachableBits.interact(BitVector.READ, lastMove.before) ||
							reachableBits.interact(BitVector.READ, lastMove.after) ||
							reachableBits.interact(BitVector.READ, lastLastMove.before) ||
							reachableBits.interact(BitVector.READ, lastLastMove.after)
						)
						{
							piece.updateReachableSquaresAndBitsAndKingSeer();
						}
					}
					else
					{
						piece.updateKingSeer();
					}
				});
				*/
				///*	//update everything
				this.movingTeam.opposition.activePieces.forEach((piece)=>{
					piece.updateReachableSquaresAndBitsAndKingSeer();
				});
				//*/
			}
			const returnVal = (this.movingTeam.opposition.numKingSeers>0)?
			{
				checkmate_in_halfmoves: 0
			}:
			{
				score: 0
			};
			if(!this.playedMoves.length==0)
			{
				/*	//revert selectively
				this.movingTeam.opposition.activePieces.forEach((piece)=>{
					if(piece instanceof DirectionPiece)
					{
						const reachableBits = piece.reachableBits.get();
						if
						(
							reachableBits.interact(BitVector.READ, lastMove.before) ||
							reachableBits.interact(BitVector.READ, lastMove.after) ||
							reachableBits.interact(BitVector.READ, lastLastMove.before) ||
							reachableBits.interact(BitVector.READ, lastLastMove.after)
						)
						{
							piece.revertReachableSquaresAndBitsAndKingSeer();
						}
					}
					else
					{
						piece.revertKingSeer();
					}
				});
				*/
				///*	//revert everything
				this.movingTeam.opposition.activePieces.forEach((piece)=>{
					piece.revertReachableSquaresAndBitsAndKingSeer();
				});
				//*/
			}
			return returnVal;
		}
		
		const reverseLine = bestEval.reverseLine ?? [];
		reverseLine.push(bestContinuation);
		
		const checkmate = "checkmate_in_halfmoves" in bestEval;
		return {
			[checkmate? "checkmate_in_halfmoves" : "score"]: checkmate? bestEval.checkmate_in_halfmoves+1 : bestEval.score,
			bestMove: bestContinuation,
			reverseLine: reverseLine
		};
	}
	//*/
	
	makeMoveForSearchExpansion(move)
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
						return Team.classOfTeamedChar(wing) != movingPiece.team.constructor;
					})
				);
			}
			this.enPassantable.update("-");
			this.movingPiece.update(movingPiece);
			this.targetPiece.update(targetPiece);
			this.firstMove.update(movingPiece.moved==false);
			
			movingPiece.moved = true;
			
			//update the piece that moved and the opposition pieces that could be blocked or unblocked by the 
			//move or the previous move (the previous move was missed by the entire opposition)
			movingPiece.updateReachableSquaresAndBitsAndKingSeer();
			
			const lastMove = this.playedMoves[this.playedMoves.length-1] ?? move;
			movingPiece.team.opposition.activePieces.forEach((piece)=>{
				if(piece instanceof DirectionPiece)
				{
					const reachableBits = piece.reachableBits.get();
					if
					(
						reachableBits.interact(BitVector.READ, move.before) ||
						reachableBits.interact(BitVector.READ, move.after) ||
						reachableBits.interact(BitVector.READ, lastMove.before) ||
						reachableBits.interact(BitVector.READ, lastMove.after)
					)
					{
						piece.updateReachableSquaresAndBitsAndKingSeer();
					}
				}
				else
				{
					piece.updateKingSeer();
				}
			});
		}
		
		this.playedMoves.push(move);
		this.progressMoveCounters();
		this.changeTurns();
	}
	
	undoMoveForSearchExpansion()
	{
		const move = this.playedMoves.pop();
		if(move instanceof PlainMove)
		{
			const movingPiece = this.movingPiece.get();
			const targetPiece = this.targetPiece.get();
			
			//move the moving piece back where it came from
			movingPiece.square = move.before;
			
			//revoke the capture of the target piece
			//NOT BEFORE REVERTING, do later
			//because the target piece may be reverted in error (could not have updated in makeMoveForSearchExpansion)
			//targetPiece?.activate();
			
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
			
			movingPiece.revertReachableSquaresAndBitsAndKingSeer();
			
			const lastMove = this.playedMoves[this.playedMoves.length-1] ?? move;
			movingPiece.team.opposition.activePieces.forEach((piece)=>{
				if(piece instanceof DirectionPiece)
				{
					const reachableBits = piece.reachableBits.get();
					if
					(
						reachableBits.interact(BitVector.READ, move.before) ||
						reachableBits.interact(BitVector.READ, move.after) ||
						reachableBits.interact(BitVector.READ, lastMove.before) ||
						reachableBits.interact(BitVector.READ, lastMove.after)
					)
					{
						piece.revertReachableSquaresAndBitsAndKingSeer();
					}
				}
				else
				{
					piece.revertKingSeer();
				}
			})
						
			//NOW revoke the capture of the target piece
			targetPiece?.activate();
		}
		
		this.regressMoveCounters();
		this.changeTurns();
	}
	
	
	makeProperMove(move)
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
						return Team.classOfTeamedChar(wing) != movingPiece.team.constructor;
					})
				);
			}
			this.enPassantable.update("-");
			this.movingPiece.update(movingPiece);
			this.targetPiece.update(targetPiece);
			this.firstMove.update(movingPiece.moved==false);
			
			movingPiece.moved = true;
			
			movingPiece.team.activePieces.forEach((piece)=>{piece.updateReachableSquaresAndBitsAndKingSeer();});
			movingPiece.team.opposition.activePieces.forEach((piece)=>{piece.updateReachableSquaresAndBitsAndKingSeer();});
		}
		
		this.playedMoves.push(move);
		this.progressMoveCounters();
		this.changeTurns();
	}
	
	undoProperMove()
	{
		const move = this.playedMoves.pop();
		if(move instanceof PlainMove)
		{
			const movingPiece = this.movingPiece.get();
			const targetPiece = this.targetPiece.get();
			
			//move the moving piece back where it came from
			movingPiece.square = move.before;
			
			//revoke the capture of the target piece AFTER REVERTING, the targetPiece was not updated before
			// ---->  targetPiece?.activate();
			
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

			movingPiece.team.activePieces.forEach((piece)=>{piece.revertReachableSquaresAndBitsAndKingSeer();});
			movingPiece.team.opposition.activePieces.forEach((piece)=>{piece.revertReachableSquaresAndBitsAndKingSeer();});	
			
			//revoke the capture of the target piece AFTER REVERTING, the targetPiece was not updated before
			targetPiece?.activate();
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
			this.makeProperMove(move);
			const condition = !(this.kingCapturable());
			this.undoProperMove();
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
	
	moveHistoryString()
	{
		//turn a list of moves into something like "1. whitemove blackmove 2.whitemove blackmove ..."
		//REQUIRES that move strings are generated in advance
		return this.playedMoves.reduce((accumulator, moveWithString, index)=>{
			//give the full move counter at the start of each full move
			if(index%2==0)
			{
				const fullMoveCounter = (index+2)/2;
				accumulator = accumulator.concat(`${fullMoveCounter>1?"\t":""}${fullMoveCounter}.`);
			}
			return accumulator.concat(` ${moveWithString.string}`);
		},"");
	}
	
	lineString(line)
	{
		//play each move in the line to obtain the next move's string
		//then undo the moves to retain current position	
		const string = line.reduce((accumulator,move,index)=>{
			if(index>0)
			{
				accumulator = accumulator.concat("\t");
			}
			accumulator = accumulator.concat(move.toString());
			this.makeProperMove(move);
			return accumulator;
		},"");
		for(const move of line)
		{
			this.undoProperMove();
		}
		
		return string;
	}
	
	scoreString(evaluation)
	{
		if("checkmate_in_halfmoves" in evaluation)
		{
			const teamToGiveMate = ((evaluation.checkmate_in_halfmoves % 2) == 0) ?
			this.movingTeam : this.movingTeam.opposition;
			const sign = teamToGiveMate instanceof Team0? "+" : "+";
			return `${sign}M${Math.floor((evaluation.checkmate_in_halfmoves+1)/2)}`;
		}
		else
		{
			return `${evaluation.score>0? "+":""}${evaluation.score}`;
		}
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
		
		const SQUARE_PIXELS = 50;

		const canvas = Canvas.createCanvas(NUM_FILES*SQUARE_PIXELS, NUM_RANKS*SQUARE_PIXELS);
		const context = canvas.getContext("2d");

		context.font = `${SQUARE_PIXELS/4}px Arial`;//SQUARE_PIXELS/4 is an arbitrarily chosen size

		const drawCalls = [];

		const lastLastMove = this.playedMoves[this.playedMoves.length-2] ?? {};
		const lastMove = this.playedMoves[this.playedMoves.length-1] ?? {};

		//draw the board bottom up so that higher squares' text does not get blocked by lower squares
		//start at the highest drawing rank, because highest coordinate is lowest on the display
		for(let drawRank=7; drawRank>=0; drawRank--)	//the "rank" on the drawn board, not necessarily the real rank
		{
			for(let drawFile=0; drawFile<NUM_FILES; drawFile++)	//the "file" on the drawn board, not necessarily the real file
			{
				const realRank = (this.movingTeam instanceof Team0)? (NUM_RANKS-1)-drawRank : drawRank;
				const realFile = (this.movingTeam instanceof Team0)? drawFile : (NUM_FILES-1)-drawFile;
				const square = Square.make(realRank,realFile);
				
				const x = drawFile*SQUARE_PIXELS;
				const y = drawRank*SQUARE_PIXELS;
				
				//colour the square
				const defaultColour = (((realRank+realFile)%2) == 0) ?  DARK_COLOUR : LIGHT_COLOUR;
				
				const fillColour = ((square == lastMove.before) || (square == lastMove.after))?
				(this.movingTeam.opposition.constructor.MOVE_COLOUR) : defaultColour;
				
				const borderColour = ((square == lastLastMove.before) || (square == lastLastMove.after))?
				(this.movingTeam.constructor.MOVE_COLOUR) : fillColour;
				
				const BORDER_WIDTH = 3;
				
				context.fillStyle = borderColour;
				context.fillRect(x, y, SQUARE_PIXELS, SQUARE_PIXELS);
				
				context.fillStyle = fillColour;
				context.fillRect(x+BORDER_WIDTH,y+BORDER_WIDTH,SQUARE_PIXELS-(2*BORDER_WIDTH),SQUARE_PIXELS-(2*BORDER_WIDTH));

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