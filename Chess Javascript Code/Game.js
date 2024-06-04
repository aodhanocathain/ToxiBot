const {NUM_RANKS, NUM_FILES, MIN_FILE} = require("./Constants.js");
const {asciiOffset, asciiDistance, deferredPromise} = require("./Helpers.js");
const {Manager} = require("./Manager.js");
const {Square} = require("./Square.js");
const {PromotionMove, CastleMove} = require("./Move.js");
const {Team, WhiteTeam, BlackTeam} = require("./Team.js");
const {Piece, King, Rook, Pawn, PieceClassesByTypeChar, WINGS, BlockablePiece} = require("./Piece.js");

const {Worker, isMainThread, parentPort} = require("worker_threads");

const NUM_CPUs = require("os").cpus().length;

const DEFAULT_ANALYSIS_DEPTH = 2;

const DRAW_BY_REPDRAW_AFTER_NO_PROGRESS_HALFMOVE_COUNTOUNT = 100;
const DRAW_BY_REPETITION_COUNT = 3;

const EMPTY_FEN_FIELD = "-";

class Game
{	
	static DEFAULT_FEN_STRING = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";	//default game
	
	//static DEFAULT_FEN_STRING = "rnbqkbnr/8/8/8/8/8/8/RNBQKBNR w KQkq - 0 1";	//king,knight,bishop,rook,queen game
	//static DEFAULT_FEN_STRING = "rnb1kbnr/8/8/8/8/8/8/RNB1KBNR w KQkq - 0 1";	//king,knight,bishop,rook game
	//static DEFAULT_FEN_STRING = "1nb1kbn1/8/8/8/8/8/8/1NB1KBN1 w KQkq - 0 1";	//king,knight,bishop game
	//static DEFAULT_FEN_STRING = "1n2k1n1/8/8/8/8/8/8/1N2K1N1 w KQkq - 0 1";	//king,knight game
	//static DEFAULT_FEN_STRING = "4k3/8/8/8/8/8/8/4K3 w KQkq - 0 1";	//king game
	
	pieces;	//indexed by a square on the board
	
	positionCounts;
	
	teams;
	movingTeam;
	
	playedMoves;
	halfMove;
	fullMove;
	
	enPassantable;
	movingPiece;
	targetPiece;
	
	piecesUpdatedPrevMove;

	static validateFENString(FENString)
	{
		const FENparts = FENString.split(" ");
		const boardString = FENparts[0];
		const rankStrings = boardString.split("/");	//ranks are delimitted by "/" in FEN strings
		if(rankStrings.length!=NUM_RANKS){return "invalid number of ranks";}
		rankStrings.reverse()	//ranks are in descending order in FEN strings, .reverse() for ascending order
		.forEach((rankString)=>{
			let file=0;
			rankString.split("").forEach((character)=>{
				if(isNaN(character))	//character denotes a piece
				{
					const typeChar = Piece.typeCharOfTeamedChar(character);
					const pieceClass = PieceClassesByTypeChar[typeChar];
					if(!pieceClass)
					{
						return "invalid piece type character";
					}					
					file += 1;
				}
				else	//character denotes a number of empty squares
				{
					file += parseInt(character);
				}
			})
			if(file!=NUM_FILES){return "invalid number of files";}
		})
		
		if(!((FENparts[1]==BlackTeam.char)||(FENparts[1]==WhiteTeam.char)))
		{
			return "invalid team's turn";
		}

		if(FENparts[2]!=EMPTY_FEN_FIELD)
		{
			const castleRightsCharacters = FENparts[2].split("");
			//check for invalid castle rights characters
			castleRightsCharacters.forEach((teamedChar)=>{
				const wingChar = Piece.typeCharOfTeamedChar(teamedChar);
				if(!(WINGS.includes(wingChar))){return "invalid castle right ";}
			});
		}

		if(FENparts[3] != EMPTY_FEN_FIELD)
		{
			const distance = asciiDistance(FENparts[3], MIN_FILE);
			if((distance < 0) || (distance >= NUM_FILES))
			{
				return "invalid en passant file";
			}
		}
		
		const halfMove = parseInt(FENparts[4]);
		if((!Number.isInteger(halfMove)) || (halfMove < 0) || (halfMove > DRAW_BY_REPDRAW_AFTER_NO_PROGRESS_HALFMOVE_COUNTOUNT) || isNaN(halfMove))
		{
			return "invalid halfmove clock";
		}

		const fullMove = parseInt(FENparts[5]);
		if((!Number.isInteger(fullMove)) || (fullMove <= 0) || isNaN(fullMove))
		{
			return "invalid fullmove clock";
		}

		return null;
	}
	
	constructor(FENString = this.constructor.DEFAULT_FEN_STRING)
	{
		this.teams = {
			[WhiteTeam.name]: new WhiteTeam(this),
			[BlackTeam.name]: new BlackTeam(this),
		};
		
		this.teams[WhiteTeam.name].opposition = this.teams[BlackTeam.name];
		this.teams[BlackTeam.name].opposition = this.teams[WhiteTeam.name];
		
		const FENparts = FENString.split(" ");
		
		//populate the board with pieces from the 1st part of the FEN string
		const boardString = FENparts[0];
		
		const rankStrings = boardString.split("/");	//ranks are delimitted by "/" in FEN strings
		this.pieces = Array(NUM_RANKS*NUM_FILES).fill(null);
		rankStrings.reverse()	//ranks are in descending order in FEN strings, .reverse() for ascending order
		.forEach((rankString,rank)=>{
			let file=0;
			rankString.split("").forEach((character)=>{
				if(isNaN(character))	//character denotes a piece
				{
					const typeChar = Piece.typeCharOfTeamedChar(character);
					const pieceClass = PieceClassesByTypeChar[typeChar];
					
					const teamClass = Team.classOfTeamedChar(character);
					const team = this.teams[teamClass.name];
					
					const square = Square.withRankAndFile(rank,file);
					let piece;
					if(pieceClass==Rook)
					{
						const bitPosition = WINGS.findIndex((wing)=>{
							return (square==teamClass.STARTING_ROOK_SQUARES_BY_WING[wing]);
						});
						const castleRightsMask = (bitPosition<0)? -1 : ~(1<<bitPosition);
						piece = new pieceClass(this,team,square,castleRightsMask);
					}
					else
					{
						piece = new pieceClass(this,team,square);
					}
					
					//current square is occupied
					this.pieces[square] = piece;
					
					team.addActivePiece(piece);
					
					file += 1;
				}
				else	//character denotes a number of empty squares
				{
					file += parseInt(character);
				}
			})
		})
		
		//determine the moving team from the 2nd part of the FEN string
		if(FENparts[1]==WhiteTeam.char)
		{
			this.movingTeam = this.teams[WhiteTeam.name];
		}
		else if(FENparts[1]==BlackTeam.char)
		{
			this.movingTeam = this.teams[BlackTeam.name];
		}

		//determine the castling rights from the 3rd part of the FEN string
		if(FENparts[2]==EMPTY_FEN_FIELD)
		{
			Object.values(this.teams).forEach((team)=>{
				team.castleRights = new Manager(0);
			});
		}
		else
		{
			const castleRightsCharacters = FENparts[2].split("");
			const differentRights = castleRightsCharacters.reduce((accumulator, teamedChar)=>{
				accumulator[teamedChar] = true;
				return accumulator;
			},{});

			Object.values(this.teams).forEach((team)=>{
				let castleRights = 0;
				WINGS.forEach((wing, wingIndex)=>{
					const teamedChar = team.constructor.charConverter(wing);
					if(teamedChar in differentRights)
					{
						if(team.rooksInStartSquaresByWing[wing])
						{
							castleRights |= (1<<wingIndex);
						}
					}

					team.castleRights = new Manager(castleRights);
				})
			})
		}

		//determine the possible en passant capture from the 4th part of the FEN string
		this.enPassantable = new Manager(FENparts[3]);
		
		//determine the halfmove and fullmove clocks from the 5th and 6th parts of the FEN string respectively
		this.halfMove = new Manager(parseInt(FENparts[4]));
		this.fullMove = parseInt(FENparts[5]);
		this.teams[WhiteTeam.name].init();
		this.teams[BlackTeam.name].init();
		
		//the white king was updated before the black pieces had any moves
		//therefore, must update white king again to rule out moves based on opposing attacks
		this.teams[WhiteTeam.name].updatePiece(this.teams[WhiteTeam.name].king);
		
		this.movingPiece = new Manager();
		this.targetPiece = new Manager();
		
		this.positionCounts = {};
		
		this.playedMoves = [];
		this.piecesUpdatedPrevMove = new Manager();
		
		this.numPositionsAnalysed = 0;
	}
	
	clone()
	{
		return new Game(this.toString());
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
	
	isDrawByRepetition()
	{
		return this.positionCounts[this.boardString()]==DRAW_BY_REPETITION_COUNT;
	}
	
	isDrawByMoveRule()
	{
		return this.halfMove.get()==DRAW_BY_REPDRAW_AFTER_NO_PROGRESS_HALFMOVE_COUNTOUNT;
	}
	
	immediatePositionScore()
	{		
		return (this.teams[WhiteTeam.name].points*WhiteTeam.SCORE_MULTIPLIER) + 
				(this.teams[BlackTeam.name].points*BlackTeam.SCORE_MULTIPLIER);
	}
	
	ABevaluate(depth=DEFAULT_ANALYSIS_DEPTH, A=WhiteTeam.INF_SCORE, B=BlackTeam.INF_SCORE)
	{
		//verify that current position is legal
		if(this.kingCapturable()){return {score:NaN};}

		//if this is a leaf node
		if(depth==0){return {score:this.immediatePositionScore()};}
		if(this.isDrawByRepetition()){return {score:0};}
		if(this.isDrawByMoveRule()){return {score:0};}
		
		let bestContinuation;
		let bestEval = {score:this.movingTeam.opposition.constructor.INF_SCORE};		
			
		const moves = this.gatherMoves();

		mainLoop:
		for(const movesList of moves)
		{
			for(let i=0; i<movesList.length; i++)
			{
				const newContinuation = movesList[i];
				this.makeMove(newContinuation);
				const newEval = this.ABevaluate(depth-1,A,B);
				this.undoMove();
				
				if(this.movingTeam.evalPreferredToEval(newEval,bestEval))
				{
					bestContinuation = newContinuation;
					bestEval = newEval;
				}
				if(this.movingTeam.evalPreferredToEval(bestEval, this.movingTeam instanceof WhiteTeam?B:A)){break mainLoop;}
				if(this.movingTeam instanceof WhiteTeam){A = bestEval;}else{B = bestEval;}
			}
		}
		
		if(!bestContinuation)
		{
			//No VALID continuation found, i.e. can't make a move without leaving king vulnerable.
			//This means the current position is either checkmate or stalemate against movingTeam
			return {
				score: this.kingChecked()?
				this.movingTeam.opposition.constructor.BEST_POSSIBLE_SCORE - (this.movingTeam.opposition.constructor.SCORE_MULTIPLIER*depth):
				0
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
	
	/*
	threadedABEvaluate(depth = DEFAULT_ANALYSIS_DEPTH)
	{
		const NUM_THREADS = Math.max(1, NUM_CPUs/2);

		this.numPositionsAnalysed++;
		if(this.kingCapturable()){return {score:NaN};}
		if(depth==0){return {score:this.immediatePositionScore()};}
		if(this.isDrawByRepetition()){return {score:0};}
		if(this.isDrawByMoveRule()){return {score:0};}
		const moves = this.gatherMoves().flat(2);
		
		const gameString = this.toString();
		
		//the available continuations will be divided among a number of threads
		const workers = Array(NUM_THREADS).fill(null).map((item)=>{return new Worker("./Chess Javascript Code/GameEvaluatorThread.js");});
		const threadStatusObjects = workers.map((worker)=>{return deferredPromise();});
		const threadStatusPromises = threadStatusObjects.map((statusObject)=>{return statusObject.promise;});
		
		const choosingTeam = this.movingTeam;
		let bestIndex;
		let bestEval = {score:this.movingTeam.opposition.constructor.INF_SCORE};	
		
		workers.forEach((worker, index)=>{
			worker.on("message", (message)=>{
				//can't pass circular objects (evaluations) back from the worker
				//solution: worker passes the index of its best continuation,
				//this index is then tried in the main thread and checked against
				//the best current index
				const moveIndex = parseInt(message);
				if(!isNaN(moveIndex))
				{
					this.makeMove(moves[moveIndex]);
					const evaluation = this.ABevaluate(depth-1);
					if(choosingTeam.evalPreferredToEval(evaluation, bestEval))
					{
						bestEval = evaluation;
						bestIndex = moveIndex;
					}
					this.undoMove();
				}
				threadStatusObjects[index].resolveFunction("done");
			});
			
			worker.postMessage(JSON.stringify(
				{
					gameString: gameString,
					threadIndex: index,
					numThreads: NUM_THREADS,
					workerDepth: depth-1
				}
			));
		});
		
		//when all threads have finished, the current best is the best
		return Promise.all(threadStatusPromises).then((values)=>{
			const reverseLine = bestEval.reverseLine ?? [];
			const bestContinuation = moves[bestIndex];
			reverseLine.push(bestContinuation);
		
			return {
				score: bestEval.score,
				bestMove: bestContinuation,
				reverseLine: reverseLine
			};
		});
	}
	*/
	
	updateMovingPieceAndOppositionPiecesSeeingMove(movingPiece, move)
	{
		
		const piecesUpdatedPrevMove = [];
		
		//potentially update all pieces on the moving team
		//because they all are able to gain/lose moves if friendly pieces get in/out of the way
		this.movingTeam.activePieces.forEach((piece)=>{
			const watchedSquares = piece.squaresWatched.get();
			if
			(
				watchedSquares.has(move.mainPieceSquareBefore) ||
				watchedSquares.has(move.mainPieceSquareAfter) ||
				watchedSquares.has(move.enPassantSquare)
			)
			{
				piece.team.updatePiece(piece);
				piecesUpdatedPrevMove.push(piece);
			}
		});
		//the above condition would not rule out a promotion piece, because the piece would not have calculated any properties
		if(move.promotionPiece){move.promotionPiece.team.updatePiece(move.promotionPiece);}	//manually update any promotion piece

		//potentially update all opposition's blockable pieces because they may have been blocked/unblocked, which would affect their moves
		//also update the opposition's king, since the castle legality may have changed if the move blocked/unblocked safe squares from attack
		//AND
		//if the moving piece was a king, must also update opposition's pattern pieces,
		//to determine if the king has just walked into check (not allowed)

		//i.e.
		//if moving piece was king, then update entire opposition
		//else just update opposition blockable pieces and king
		if(!(movingPiece instanceof King))
		{
			this.movingTeam.opposition.updatePiece(this.movingTeam.opposition.king);
			piecesUpdatedPrevMove.push(this.movingTeam.opposition.king);
			this.movingTeam.opposition.activePieces.forEach((piece)=>{
				if(piece instanceof BlockablePiece)
				{
					const watchedSquares = piece.squaresWatched.get();
					if
					(
						watchedSquares.has(move.mainPieceSquareBefore) ||
						watchedSquares.has(move.mainPieceSquareAfter) ||
						watchedSquares.has(move.enPassantSquare)
					)
					{
						piece.team.updatePiece(piece);
						piecesUpdatedPrevMove.push(piece);
					}
				}
			});
		}
		else
		{
			this.movingTeam.opposition.activePieces.forEach((piece)=>{
				const watchedSquares = piece.squaresWatched.get();
				if
				(
					watchedSquares.has(move.mainPieceSquareBefore) ||
					watchedSquares.has(move.mainPieceSquareAfter) ||
					watchedSquares.has(move.enPassantSquare)
				)
				{
					piece.team.updatePiece(piece);
					piecesUpdatedPrevMove.push(piece);
				}
			});
		}
		
		this.piecesUpdatedPrevMove.update(piecesUpdatedPrevMove);
	}
	
	makeMove(move)
	{
		//remove the captured piece, if any
		const captureSquare = move.enPassantSquare || move.mainPieceSquareAfter;
		const targetPiece = this.pieces[captureSquare];
		targetPiece?.deactivate();
		this.pieces[captureSquare] = null;
		if(targetPiece)
		{
			targetPiece.team.castleRights.update(targetPiece.team.castleRights.get() & targetPiece.castleRightsMask);
		}
		
		//move the main piece to new square
		const movingPiece = this.pieces[move.mainPieceSquareBefore];
		movingPiece.square = move.mainPieceSquareAfter;
		this.pieces[move.mainPieceSquareAfter] = movingPiece;
		movingPiece.team.activePieceLocations.add(move.mainPieceSquareAfter);
		movingPiece.team.castleRights.update(movingPiece.team.castleRights.get() & movingPiece.castleRightsMask);
		
		//remove main piece from old square
		this.pieces[move.mainPieceSquareBefore] = null;
		movingPiece.team.activePieceLocations.remove(move.mainPieceSquareBefore);
		
		//some types of moves require more work than just moving the main piece
		if(move instanceof CastleMove)
		{
			//castlerights already set to 0 by the king' share of the move

			//move the rook to its new square as well
			const rook = this.pieces[move.rookBefore];
			this.pieces[move.rookAfter] = rook;
			rook.team.activePieceLocations.add(move.rookAfter);

			//remove the rook from its old square
			this.pieces[move.rookBefore] = null;
			rook.team.activePieceLocations.remove(move.rookBefore);
		}
		else if(move instanceof PromotionMove)
		{
			//promote the pawn
			movingPiece.team.swapOldPieceForNewPiece(movingPiece, move.promotionPiece);
		}
		
		let enPassantableUpdate = "-";
		if(movingPiece instanceof Pawn)
		{
			const beforeRank = Square.rank(move.mainPieceSquareBefore);
			const afterRank = Square.rank(move.mainPieceSquareAfter);
			const distance = afterRank-beforeRank;
			if((distance/Pawn.LONG_MOVE_RANK_INCREMENT_MULTIPLIER)==movingPiece.team.constructor.PAWN_RANK_INCREMENT)
			{
				enPassantableUpdate = asciiOffset(MIN_FILE, Square.file(move.mainPieceSquareAfter))	//could have used mainPieceSquareBefore instead
			}
		}
		this.enPassantable.update(enPassantableUpdate);
		
		this.movingPiece.update(movingPiece);
		this.targetPiece.update(targetPiece);
		
		this.updateMovingPieceAndOppositionPiecesSeeingMove(movingPiece, move);
		
		this.playedMoves.push(move);
		
		const nextHalfMove = ((movingPiece instanceof Pawn) || targetPiece)? 0 : this.halfMove.get()+1;
		this.halfMove.update(nextHalfMove);
		this.changeTurns();
		if(this.movingTeam==this.teams[WhiteTeam.name]){this.fullMove++;}
		const boardString = this.boardString();
		if(boardString in this.positionCounts)
		{
			this.positionCounts[boardString]++;
		}
		else
		{
			this.positionCounts[boardString] = 1;
		}
	}
	
	undoMove()
	{
		this.positionCounts[this.boardString()]--;
		if(this.movingTeam==this.teams[WhiteTeam.name]){this.fullMove--;}
		this.changeTurns();
		this.halfMove.revert();
		
		const move = this.playedMoves.pop();
		
		const movingPiece = this.movingPiece.pop();
		const targetPiece = this.targetPiece.pop();
		
		const piecesUpdatedPrevMove = this.piecesUpdatedPrevMove.pop();
		piecesUpdatedPrevMove.forEach((piece)=>{piece.team.revertPiece(piece);});
		
		this.enPassantable.revert();
		
		if(move instanceof CastleMove)
		{
			//move the rook back to its old square
			const rook = this.pieces[move.rookAfter];
			this.pieces[move.rookBefore] = rook;
			rook.team.activePieceLocations.add(move.rookBefore);

			//remove the rook from its new square
			this.pieces[move.rookAfter] = null;
			rook.team.activePieceLocations.remove(move.rookAfter);
		}
		else if(move instanceof PromotionMove)
		{
			//deomote the pawn
			movingPiece.team.swapOldPieceForNewPiece(move.promotionPiece, movingPiece);
		}

		//move main piece back to old square
		movingPiece.square = move.mainPieceSquareBefore;
		this.pieces[move.mainPieceSquareBefore] = movingPiece;
		movingPiece.team.activePieceLocations.add(move.mainPieceSquareBefore);
		movingPiece.team.castleRights.revert();

		//remove main piece from new square
		this.pieces[move.mainPieceSquareAfter] = null;
		movingPiece.team.activePieceLocations.remove(move.mainPieceSquareAfter);

		//restore captured piece, if any
		const captureSquare = move.enPassantSquare || move.mainPieceSquareAfter;;
		this.pieces[captureSquare] = targetPiece;
		targetPiece?.activate();
		targetPiece?.team.castleRights.revert();
	}
	
	gatherMoves()
	{
		return this.movingTeam.gatherMoves();
	}
	
	calculateLegals()
	{
		//moves are illegal if they leave the team's king vulnerable to capture
		return this.gatherMoves().flat(1).filter((move)=>{
			this.makeMove(move);
			const condition = !(this.kingCapturable());
			this.undoMove();
			return condition;
		});
	}
	
	kingCapturable()
	{	
		return this.movingTeam.idsSeeingOpposingKingBitVector.isEmpty()==false;
	}
	
	kingChecked()
	{
		return this.movingTeam.opposition.idsSeeingOpposingKingBitVector.isEmpty()==false;
	}
	
	moveHistoryString()
	{
		//turn a list of moves into something like "1. whitemove blackmove 2.whitemove blackmove ..."
		return this.playedMoves.reduce((accumulator, move, index)=>{
			//give the full move counter at the start of each full move
			if(index%2==0)
			{
				const fullMoveCounter = (index+2)/2;
				accumulator = accumulator.concat(`${fullMoveCounter>1?"\t":""}${fullMoveCounter}.`);
			}
			return accumulator.concat(` ${move.toString(this)}`);
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
			move.generateString(this);
			accumulator = accumulator.concat(move.toString(this));
			this.makeMove(move);
			return accumulator;
		},"");
		for(const move of line)
		{
			this.undoMove();
		}
		
		return string;
	}
	
	scoreString(evaluation)
	{
		//minus signs show up in negative numbers but positive signs dont show up in positive numbers
		//either branch here adds a plus sign if necessary to their string
		if("checkmate_in_halfmoves" in evaluation)
		{
			const teamToGiveMate = ((evaluation.checkmate_in_halfmoves % 2) == 0) ?
			this.movingTeam : this.movingTeam.opposition;
			const sign = teamToGiveMate instanceof WhiteTeam? "+" : "";
			return `${sign}M${Math.floor((evaluation.checkmate_in_halfmoves+1)/2)}`;
		}
		else
		{
			const sign = (evaluation.score>=0)? "+" : ""
			return `${sign}${evaluation.score.toPrecision(3)}`;
		}
	}
	
	boardString()
	{		
		const descendingRankStrings = [];
		for(let rank=NUM_RANKS-1; rank>=0; rank--)
		{
			let rankString = ``;
			let emptySquares=0;
			for(let file=0; file<NUM_FILES; file++)
			{
				const square = Square.withRankAndFile(rank,file);
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
		return descendingRankStrings.join("/");
	}
	
	toString()	//specifically to a FEN string
	{
		const boardString = this.boardString();
		let castleRightsString = Object.values(this.teams).reduce((accumulator, team)=>{
			WINGS.forEach((wing, wingIndex)=>{
				if(team.castleRights.get() & (1<<wingIndex))
				{
					accumulator.push(team.constructor.charConverter(wing));
				}
			})
			return accumulator;
		}, []).sort().join("");
		if(castleRightsString==""){castleRightsString="-";}
		return [boardString, this.movingTeam.constructor.char, castleRightsString, this.enPassantable.get(), this.halfMove.get(), this.fullMove].join(" ");
	}
}

module.exports = {
	Game: Game
}