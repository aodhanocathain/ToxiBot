const {Team, TeamClassesArray} = require("./Team.js");
const [WhiteTeam, BlackTeam] = TeamClassesArray;

const {Piece, PatternPiece, DirectionPiece, PieceTypeCharClasses, PieceClassesArray} = require("./Piece.js");
const [King] = PieceClassesArray;

const {Square} = require("./Square.js");
const {NUM_RANKS, NUM_FILES} = require("./Constants.js");

const {PlainMove} = require("./Move.js");

const Canvas = require("canvas");

const DEFAULT_FEN_STRING = "rnbqkbnr/8/8/8/8/8/8/RNBQKBNR w KQkq - 0 1";

const MAX_DEPTH = 3;

class Game
{
	squares;
	
	teams;
	movingTeam;
	
	castleRights;
	enPassantable;
	halfMove;
	fullMove;

	playedMoves;
	
	moves;
	movesCache;
	legals;
	legalsCache;
	
	constructor(FENString = DEFAULT_FEN_STRING)
	{
		//initialize the teams
		const white = new WhiteTeam();
		const black = new BlackTeam();
		white.opposition = black;
		black.opposition = white;
		
		this.teams = {
			[white.constructor.char]:white,
			[black.constructor.char]:black
		};
		
		//initialize an empty board
		this.squares = Array(NUM_RANKS).fill(null).map((item,rank)=>{
			return Array(NUM_FILES).fill(null).map((item,file)=>{
				return new Square(rank,file,this);
			});
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
					//create a piece using the character
					const typeChar = Piece.typeCharOfTeamedChar(character);
					const pieceClass = PieceTypeCharClasses[typeChar];
					const piece = new pieceClass();
					
					//assign the piece to a team according to the character case
					const teamChar = Team.charOfTeamedChar(character);
					const team = this.teams[teamChar];
					team.addPiece(piece, team);
					
					//position the piece in the game
					piece.putInEmptySquare(this.squares[rank][file]);
					
					file += 1;
				}
				else	//character denotes a number of empty squares
				{
					file += parseInt(character);
				}
			})
		})
		
		this.movingTeam = this.teams[FENparts[1]];
		
		//this.castleRights = FENparts[2].split("");
		//this.enPassantable = FENparts[3];
		
		this.halfMove = parseInt(FENparts[4]);
		this.fullMove = parseInt(FENparts[5]);
		
		this.playedMoves = [];
		
		white.updateAllReachableSquares();
		black.updateAllReachableSquares();
		
		this.movesCache = [];
		this.legalsCache = [];
		
		this.updateMoves();
		this.updateLegals();
	}
	
	getMoves()
	{
		return this.moves;
	}
	
	getLegals()
	{
		return this.legals;
	}
	
	changeTurns()
	{
		//the new moving team is the opposition of the old moving team
		this.movingTeam = this.movingTeam.opposition;
	}
	
	immediatePositionScore()
	{
		//loose heuristic for now
		return this.teams[WhiteTeam.char].points - this.teams[BlackTeam.char].points;
	}
	
	isCheckmate()
	{
		//by definition
		return (this.getLegals().length == 0) && this.kingChecked();
	}

	isStalemate()
	{
		//by definition
		return (this.getLegals().length == 0) && !(this.kingChecked());
	}

	evaluate(depth = 1)
	{
		if(depth>0)
		{
			const continuations = this.getLegals();
			const scorePreferredToScore = this.movingTeam.constructor.scorePreferredToScore;
			//need to score checkmates and stalemates in future
			//maybe track temporal proximity of mates with a {"mate in halfmoves": 0}
			//that increments each turn back in time
			
			//start with the first continuation as the best
			let bestContinuation = continuations[0];
			this.makeMoveWithConditionalLegalsUpdate(bestContinuation, true);
			let bestEval = this.evaluate(depth-1);
			this.undoMoveWithConditionalLegalsUpdate(true);
			
			//check for better continuations
			for(let i=1; i<continuations.length; i++)
			{
				/*
				if(depth == MAX_DEPTH)
				{
					console.log(`${i}/${continuations.length}`);
				}
				*/
				const newContinuation = continuations[i];
				this.makeMoveWithConditionalLegalsUpdate(newContinuation, true);
				const newEval = this.evaluate(depth-1);
				this.undoMoveWithConditionalLegalsUpdate(true);
				
				if(scorePreferredToScore(newEval.score,bestEval.score))
				{
					bestContinuation = newContinuation;
					bestEval = newEval;
				}
			}
			
			const reverseLine = bestEval.reverseLine ?? [];
			reverseLine.push(bestContinuation);
			return {
				score: bestEval.score,
				bestMove: bestContinuation,
				reverseLine: reverseLine
			};
		}
		else
		{
			return {
				score: this.immediatePositionScore()
			};
		}
	}
	
	makeMoveWithConditionalLegalsUpdate(move, condition)
	{
		if(move instanceof PlainMove)
		{
			const movingPiece = move.before.piece;
			
			movingPiece.moveToSquare(move.after);
		}
		
		this.playedMoves.push(move);
		
		this.progressMoveCounters();
		this.changeTurns();
		
		this.updateMoves();
		if(condition)
		{
			this.updateLegals();
		}
	}
	
	undoMoveWithConditionalLegalsUpdate(condition)
	{
		const move = this.playedMoves.pop();
		if(move instanceof PlainMove)
		{
			const mainTransition = move.mainTransition;
			const movingPiece = move.after.piece;
			
			movingPiece.moveToSquare(move.before);
			movingPiece.moved = (move.firstMove == false);
			
			move.targetPiece?.activate();
			move.after.piece = move.targetPiece;
		}
		
		this.regressMoveCounters();
		this.changeTurns();
		
		this.revertMoves();
		if(condition)
		{
			this.revertLegals();
		}
	}
	
	calculateMoves()
	{
		const moves = [];
		this.teams[WhiteTeam.char].updateDirectionReachableSquares();
		this.teams[BlackTeam.char].updateDirectionReachableSquares();
		this.movingTeam.alivePatternPieces.forEach((piece)=>{
			//get destination squares of current piece
			const currentSquare = piece.square;
			const reachableSquares = piece.reachableSquares;
			reachableSquares.forEach((reachableSquare)=>{
				//only allow moves that do not capture pieces from the same team
				if(currentSquare.piece.team != reachableSquare.piece?.team)
				{
					moves.push(new PlainMove(currentSquare, reachableSquare));
				}
			})
		});
		this.movingTeam.aliveDirectionPieces.forEach((piece)=>{
			//get destination squares of current piece
			const currentSquare = piece.square;
			const reachableSquares = piece.reachableSquares;
			reachableSquares.forEach((reachableSquare)=>{
				//only allow moves that do not capture pieces from the same team
				if(currentSquare.piece.team != reachableSquare.piece?.team)
				{
					moves.push(new PlainMove(currentSquare, reachableSquare));
				}
			})
		});
		return moves;
	}
	
	calculateLegals()
	{
		return this.getMoves().filter((move)=>{
			this.makeMoveWithConditionalLegalsUpdate(move, false);
			const condition = !(this.kingCapturable());
			this.undoMoveWithConditionalLegalsUpdate(false);
			return condition;
		});
	}
	
	updateLegals()
	{
		this.legalsCache.push(this.legals);
		this.legals = this.calculateLegals();
	}
	
	updateMoves()
	{
		this.movesCache.push(this.moves);
		this.moves = this.calculateMoves();
	}
	
	revertLegals()
	{
		this.legals = this.legalsCache.pop();
	}
	
	revertMoves()
	{
		this.moves = this.movesCache.pop();
	}
	
	kingCapturable()
	{		
		return this.getMoves().some((move)=>{
			if(move instanceof PlainMove)
			{
				return move.targetPiece == this.movingTeam.opposition.king;
			}
		});
	}
	
	kingChecked()
	{
		return this.movingTeam.opposition.alivePatternPieces.some((piece)=>{
			const reachableSquares = piece.reachableSquares;
			return reachableSquares.some((square)=>{
				return square.piece == this.movingTeam.king;
			});
		}) || this.movingTeam.opposition.aliveDirectionPieces.some((piece)=>{
			const reachableSquares = piece.reachableSquares;
			return reachableSquares.some((square)=>{
				return square.piece == this.movingTeam.king;
			});
		});
	}
	
	regressMoveCounters()
	{
		if(this.halfMove==0)
		{
			this.fullMove--;
		}
		this.halfMove = (this.halfMove+1)%2;
	}
	
	progressMoveCounters()
	{
		if(this.halfMove==1)
		{
			//this corresponds to when black has just moved, meaning a full move has passed
			this.fullMove++;
		}
		this.halfMove = (this.halfMove+1)%2;
	}
	
	toString()
	{
		//game stores ranks in ascending order, must reverse a copy for descending order in FEN string
		const squaresCopy = this.squares.slice();
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
	Game:Game,
	
	MAX_DEPTH:MAX_DEPTH
}