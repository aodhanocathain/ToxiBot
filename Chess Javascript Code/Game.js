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
	//locations in the game containing pieces
	pieces;	
	squaresOccupiedBitVector;
	
	white;
	black;
	movingTeam;
	
	playedMoves;
	castleRights;
	enPassantable;
	halfMove;
	fullMove;
	
	constructor(FENString = DEFAULT_FEN_STRING)
	{
		this.squaresOccupiedBitVector = new BitVector();
		
		this.white = new WhiteTeam(this);
		this.black = new BlackTeam(this);
		this.white.opposition = this.black;
		this.black.opposition = this.white;
		
		//initialize an empty board
		this.pieces = Array(NUM_RANKS).fill(null).map(()=>{
			return Array(NUM_FILES).fill(null);
		});
		
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
					const piece = new pieceClass(this,team,square,team.generateId(),false);	
					
					//current square is occupied
					this.pieces[square] = piece;
					this.squaresOccupiedBitVector.set(square);
					
					team.addPiece(piece);
					
					file += 1;
				}
				else	//character denotes a number of empty squares
				{
					file += parseInt(character);
				}
			})
		})
		
		this.movingTeam = (FENparts[1] == WhiteTeam.char)? this.white : this.black;
		
		this.castleRights = FENparts[2].split("");
		this.enPassantable = FENparts[3];
		
		this.halfMove = parseInt(FENparts[4]);
		this.fullMove = parseInt(FENparts[5]);
		
		this.playedMoves = [];
		
		this.white.updateReachableSquaresAndBitsAndKingSeers();
		this.black.updateReachableSquaresAndBitsAndKingSeers();
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

	evaluate(depth = 1)
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
			
			const reverseLine = bestEval.reverseLine ?? [];
			reverseLine.push(bestContinuation);
			
			this.movingTeam.revertReachableSquaresAndBitsAndKingSeers();
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
			move.targetPiece?.deactivate()
			
			this.pieces[move.after] = move.movingPiece;
			this.squaresOccupiedBitVector.set(move.after);
			
			this.pieces[move.before] = null;
			this.squaresOccupiedBitVector.clear(move.before);
			
			move.movingPiece.square = move.after;
			move.movingPiece.moved = true;
			
			if(move.movingPiece instanceof King)
			{
				//opponent retains castling rights, moving team forfeits castle rights
				this.castleRights = this.castleRights.filter((wing)=>{
					return Team.charOfTeamedChar(wing) != move.movingPiece.team.constructor.char;
				});
			}
			this.enPassantable = "-";
		}
		
		this.playedMoves.push(move);
		
		this.progressMoveCounters();
		this.changeTurns();
		
		this.movingTeam.updateReachableSquaresAndBitsAndKingSeers();
	}
	
	undoMove()
	{
		this.movingTeam.revertReachableSquaresAndBitsAndKingSeers();
		const move = this.playedMoves.pop();
		if(move instanceof PlainMove)
		{
			move.targetPiece?.activate();
			
			this.pieces[move.before] = move.movingPiece;
			this.squaresOccupiedBitVector.set(move.before);
			
			this.pieces[move.after] = move.targetPiece;
			if(!(move.targetPiece))
			{
				this.squaresOccupiedBitVector.clear(move.after);
			}
			
			move.movingPiece.square = move.before;
			move.movingPiece.moved = (move.firstMove == false);
			
			this.castleRights = move.castleRights;
			this.enPassantable = move.enPassantable;
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
		return this.calculateMoves().filter((move)=>{
			this.makeMove(move);
			const condition = !(this.kingCapturable());
			this.undoMove();
			return condition;
		});
	}
	
	kingCapturable()
	{	
		return this.movingTeam.numKingSeers > 0;
	}
	
	kingChecked()
	{
		const movingTeamKingSquare = this.movingTeam.king.square;
		this.movingTeam.opposition.updateReachableSquaresAndBitsAndKingSeers();
		const status = this.movingTeam.opposition.activePieces.some((piece)=>{
			return piece.reachableBits.get().read(movingTeamKingSquare);
		});
		this.movingTeam.opposition.revertReachableSquaresAndBitsAndKingSeers();
		return status;
	}
	
	regressMoveCounters()
	{
		/*
		if(this.halfMove==0)
		{
			this.fullMove--;
		}
		*/
		this.fullMove -= 1-this.halfMove;
		
		//this.halfMove = (this.halfMove+1)%2;
		this.halfMove = (this.halfMove + 1) & 1;
	}
	
	progressMoveCounters()
	{
		/*
		if(this.halfMove==1)
		{
			//this corresponds to when black has just moved, meaning a full move has passed
			this.fullMove ++;
		}
		*/
		this.fullMove += this.halfMove;
		
		//this.halfMove = (this.halfMove+1)%2;
		this.halfMove = (this.halfMove + 1) & 1;
	}
	
	toString()
	{
		//game stores ranks in ascending order, must reverse a copy for descending order in FEN string
		const squaresCopy = this.pieces.slice();
		const boardString = squaresCopy.reverse().map((rankSquares)=>{
			let emptySquares = 0;
			let rankString = rankSquares.reduce((accumulator, square)=>{
				if(square.piece)
				{
					if(emptySquares>0)
					{
						//denote how many empty squares separate pieces
						accumulator = accumulator.concat(`${emptySquares}`);
						emptySquares = 0;
					}
					accumulator = accumulator.concat(`${square.piece.toString()}`);
				}
				else
				{
					emptySquares++;
				}
				return accumulator;
			}, "")
			if(emptySquares > 0)
			{
				//denote how many empty squares remain in the rank after the final piece
				rankString = rankString.concat(`${emptySquares}`);
			}
			return rankString;
		}).join("/");
		return [boardString, this.movingTeam.constructor.char, this.castleRights.join(""), this.enPassantable, this.halfMove, this.fullMove].join(" ");
	}
}

module.exports = {
	Game:Game
}