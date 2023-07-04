const {Team, TeamClassesArray} = require("./Team.js");
const [WhiteTeam, BlackTeam] = TeamClassesArray;

const {Piece, PatternPiece, DirectionPiece, PieceTypeCharClasses, PieceClassesArray} = require("./Piece.js");
const [King] = PieceClassesArray;

const {NUM_RANKS, NUM_FILES} = require("./Constants.js");

const {PlainMove} = require("./Move.js");

const {BitVector64} = require("./BitVector64.js");

const {Square} = require("./Square.js");

const {Manager} = require("./Manager.js");

const Canvas = require("canvas");

const DEFAULT_FEN_STRING = "rnbqkbnr/8/8/8/8/8/8/RNBQKBNR w KQkq - 0 1";

class Game
{
	//locations in the game containing pieces
	pieces;	
	squaresOccupiedBitVector;

	reachableSquaresBits;
	moves;
	legals;
	
	teams;
	movingTeam;
	
	playedMoves;
	castleRights;
	enPassantable;
	halfMove;
	fullMove;
	
	constructor(FENString = DEFAULT_FEN_STRING)
	{
		this.squaresOccupiedBitVector = new BitVector64();
		
		this.reachableSquaresBits = new Manager();
		this.moves = new Manager();
		this.legals = new Manager();
		
		const white = new WhiteTeam();
		const black = new BlackTeam();
		white.opposition = black;
		black.opposition = white;
		this.teams = {
			[white.constructor.char]:white,
			[black.constructor.char]:black
		};
		
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
					//create a piece using the character
					const typeChar = Piece.typeCharOfTeamedChar(character);
					const pieceClass = PieceTypeCharClasses[typeChar];
					const piece = new pieceClass();
					
					const newSquare = Square.make(rank,file);
					
					//current square is occupied
					this.pieces[newSquare] = piece;
					this.squaresOccupiedBitVector.set(newSquare);
					
					//assign the piece to a team according to the character case
					const teamChar = Team.charOfTeamedChar(character);
					const team = this.teams[teamChar];
					team.addPieceAtSquare(piece, newSquare);
					
					file += 1;
				}
				else	//character denotes a number of empty squares
				{
					file += parseInt(character);
				}
			})
		})
		
		this.movingTeam = this.teams[FENparts[1]];
		
		this.castleRights = FENparts[2].split("");
		this.enPassantable = FENparts[3];
		
		this.halfMove = parseInt(FENparts[4]);
		this.fullMove = parseInt(FENparts[5]);
		
		this.playedMoves = [];
		
		white.updateAllReachableSquaresAndBitsInGame(this);
		black.updateAllReachableSquaresAndBitsInGame(this);
		
		const calculations = this.calculateMovesAndBits();
		this.reachableSquaresBits.update(calculations[1]);
		this.moves.update(calculations[0]);
		this.legals.update(this.calculateLegals());
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
		return (this.legals.get().length == 0) && this.kingChecked();
	}

	isStalemate()
	{
		//by definition
		return (this.legals.get().length == 0) && !(this.kingChecked());
	}

	evaluate(depth = 1)
	{
		if(depth==0)
		{
			return {
				score: this.immediatePositionScore(),
			}
		}
		else
		{
			if(depth==1)
			{
				const continuations = this.legals.get();
				const scorePreferredToScore = this.movingTeam.constructor.scorePreferredToScore;
				
				//start with the first continuation as the best
				let bestContinuation = continuations[0];
				this.makeMoveEvalConsequences(bestContinuation);
				let bestEval = this.evaluate(depth-1);
				this.undoMoveEvalConsequences(bestContinuation);
				
				//check for better continuations
				for(let i=1; i<continuations.length; i++)
				{
					const newContinuation = continuations[i];
					this.makeMoveEvalConsequences(newContinuation);
					const newEval = this.evaluate(depth-1);
					this.undoMoveEvalConsequences(newContinuation);
					
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
				const continuations = this.legals.get();
				const scorePreferredToScore = this.movingTeam.constructor.scorePreferredToScore;
				
				//start with the first continuation as the best
				let bestContinuation = continuations[0];
				this.makeMoveWithConditionalLegalsUpdate(bestContinuation, true);
				let bestEval = this.evaluate(depth-1);
				this.undoMoveWithConditionalLegalsUpdate(true);
				
				//check for better continuations
				for(let i=1; i<continuations.length; i++)
				{
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
		}
	}
	
	makeMoveForEvalConsequences(move)
	{
		if(move instanceof PlainMove)
		{
			move.targetPiece?.deactivate();
		}
	}
	
	undoMoveForEvalConsequences(move)
	{
		if(move instanceof PlainMove)
		{
			move.targetPiece?.activate();
		}
	}
	
	makeMoveWithConditionalLegalsUpdate(move, condition)
	{
		if(move instanceof PlainMove)
		{
			move.targetPiece?.deactivate()
			
			this.pieces[move.after] = move.movingPiece;
			this.squaresOccupiedBitVector.set(move.after);
			
			this.pieces[move.before] = null;
			this.squaresOccupiedBitVector.clear(move.before);
			
			move.movingPiece.team[`${move.movingPiece instanceof PatternPiece?"pattern":"direction"}PieceSquares`][move.movingPiece.id] =
			move.after;
			
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
		
		const calculations = this.calculateMovesAndBits();
		this.moves.update(calculations[0]);
		this.reachableSquaresBits.update(calculations[1]);
		if(condition)
		{
			this.legals.update(this.calculateLegals());
		}
	}
	
	undoMoveWithConditionalLegalsUpdate(condition)
	{
		const move = this.playedMoves.pop();
		if(move instanceof PlainMove)
		{
			move.targetPiece?.activate()
			
			this.pieces[move.before] = move.movingPiece;
			this.squaresOccupiedBitVector.set(move.before);
			
			if(!move.targetPiece)
			{
				this.pieces[move.after] = null;
				this.squaresOccupiedBitVector.clear(move.after);
			}
			else
			{
				this.pieces[move.after] = move.targetPiece;
			}
			
			move.movingPiece.team[`${move.movingPiece instanceof PatternPiece?"pattern":"direction"}PieceSquares`][move.movingPiece.id] =
			move.before;			
			
			move.movingPiece.moved = (move.firstMove == false);
			this.castleRights = move.castleRights;
			this.enPassantable = move.enPassantable;
		}
		
		this.regressMoveCounters();
		this.changeTurns();
		
		this.moves.revert();
		this.reachableSquaresBits.revert();
		if(condition)
		{
			this.legals.revert();
		}
	}
	
	calculateMovesAndBits()
	{
		const moves = [];
		const bits = new BitVector64();
		
		this.movingTeam.updateDirectionReachableSquaresAndBitsInGame(this);
		this.movingTeam.alivePatternPieces.forEach((piece)=>{
			//get destination squares of current piece
			bits.or(piece.reachableBits);
			const currentSquare = this.movingTeam.patternPieceSquares[piece.id];
			const reachableSquares = piece.reachableSquares;
			reachableSquares.forEach((reachableSquare)=>{
				//only allow moves that do not capture pieces from the same team
				if(this.pieces[reachableSquare]?.team != piece.team)
				{
					moves.push(new PlainMove(this, currentSquare, reachableSquare));
				}
			})
		});
		this.movingTeam.aliveDirectionPieces.forEach((piece)=>{
			//get destination squares of current piece
			bits.or(piece.reachableBits);
			const currentSquare = this.movingTeam.directionPieceSquares[piece.id];
			const reachableSquares = piece.reachableSquares;
			reachableSquares.forEach((reachableSquare)=>{
				//only allow moves that do not capture pieces from the same team
				if(this.pieces[reachableSquare]?.team != piece.team)
				{
					moves.push(new PlainMove(this, currentSquare, reachableSquare));
				}
			})
		});
		return [moves, bits];
	}
	
	calculateLegals()
	{
		return this.moves.get().filter((move)=>{
			this.makeMoveWithConditionalLegalsUpdate(move, false);
			const condition = !(this.kingCapturable());
			this.undoMoveWithConditionalLegalsUpdate(false);
			return condition;
		});
	}
	
	kingCapturable()
	{	
		const opposition = this.movingTeam.opposition;
		const oppositionKingSquare = opposition.patternPieceSquares[opposition.king.id];
		return this.movingTeam.alivePatternPieces.some((piece)=>{
			return piece.reachableBits.read(oppositionKingSquare);
		}) || this.movingTeam.aliveDirectionPieces.some((piece)=>{
			return piece.reachableBits.read(oppositionKingSquare);
		});
	}
	
	kingChecked()
	{
		const movingTeamKingSquare = this.movingTeam.patternPieceSquares[this.movingTeam.king.id];
		this.movingTeam.opposition.updateAllReachableSquaresAndBitsInGame(this);
		
		return this.movingTeam.opposition.alivePatternPieces.some((piece)=>{
			return piece.reachableBits.read(movingTeamKingSquare);
		}) ||
		this.movingTeam.opposition.aliveDirectionPieces.some((piece)=>{
			return piece.reachableBits.read(movingTeamKingSquare);
		});
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