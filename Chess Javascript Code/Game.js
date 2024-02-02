const {NUM_RANKS, NUM_FILES, MIN_FILE} = require("./Constants.js");
const {asciiOffset, asciiDistance, deferredPromise} = require("./Helpers.js");
const {BitVector64} = require("./BitVector64.js");
const {Manager} = require("./Manager.js");
const {Square} = require("./Square.js");
const {PlainMove, PromotionMove} = require("./Move.js");
const {Team, WhiteTeam, BlackTeam} = require("./Team.js");
const {Piece, King, Queen, Rook, Pawn, PieceClassesByTypeChar, WINGS} = require("./Piece.js");

const {Worker, isMainThread, parentPort} = require("worker_threads");

const NUM_CPUs = require("os").cpus().length;

const DEFAULT_ANALYSIS_DEPTH = 1;

const DRAW_AFTER_NO_PROGRESS_HALFMOVES = 100;
const DRAW_BY_REPETITIONS = 3;

const EMPTY_FEN_FIELD = "-";

function mergeSortEvaluations(evaluations, start, end, team)
{	
	const range = end-start;
	if(range==1){return;}
	
	const leftStart = start;
	const leftEnd = start + Math.floor(range/2);
	const rightStart = leftEnd;
	const rightEnd = end;
	
	mergeSortEvaluations(evaluations, leftStart, leftEnd, team);
	mergeSortEvaluations(evaluations, rightStart, rightEnd, team);
	
	let leftIndex = leftStart;
	let rightIndex = rightStart;
	let sortedIndex = 0;
	
	const sortedSub = Array(range);
	while((leftIndex<leftEnd) && (rightIndex<rightEnd))
	{
		if(team.evalPreferredToEval(evaluations[leftIndex],evaluations[rightIndex]))
		{
			sortedSub[sortedIndex++] = evaluations[leftIndex++];
		}
		else
		{
			sortedSub[sortedIndex++] = evaluations[rightIndex++];
		}
	}
	
	while(leftIndex<leftEnd)
	{
		sortedSub[sortedIndex++] = evaluations[leftIndex++];
	}
	
	while(rightIndex<rightEnd)
	{
		sortedSub[sortedIndex++] = evaluations[rightIndex++];
	}
	
	for(let i=0; i<sortedSub.length; i++)
	{
		evaluations[start + i] = sortedSub[i];
	}
}

class Game
{	
	static DEFAULT_FEN_STRING = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";	//default game
	
	//static DEFAULT_FEN_STRING = "rnbqkbnr/8/8/8/8/8/8/RNBQKBNR w KQkq - 0 1";	//king,knight,bishop,rook,queen game
	//static DEFAULT_FEN_STRING = "rnb1kbnr/8/8/8/8/8/8/RNB1KBNR w KQkq - 0 1";	//king,knight,bishop,rook game
	//static DEFAULT_FEN_STRING = "1nb1kbn1/8/8/8/8/8/8/1NB1KBN1 w KQkq - 0 1";	//king,knight,bishop game
	//static DEFAULT_FEN_STRING = "1n2k1n1/8/8/8/8/8/8/1N2K1N1 w KQkq - 0 1";	//king,knight game
	//static DEFAULT_FEN_STRING = "4k3/8/8/8/8/8/8/4K3 w KQkq - 0 1";	//king game
	
	pieces;	//indexed by a square on the board
	
	positionFrequenciesByBoardString;
	
	teamsByName;
	movingTeam;
	
	playedMoves;
	halfMove;
	fullMove;
	
	enPassantable;
	movingPiece;
	targetPiece;
	
	fullUpdatedPieces;
	
	numPositionsAnalysed;
		
	static validFENString(FENString)
	{
		//FEN string validity is checked in the Game constructor already
		try
		{
			new Game(FENString);
			return true;
		}
		catch(error)
		{
			console.log(error);
			return false;
		}
	}
	
	constructor(FENString = this.constructor.DEFAULT_FEN_STRING)
	{		
		this.teamsByName = {
			[WhiteTeam.name]: new WhiteTeam(this),
			[BlackTeam.name]: new BlackTeam(this),
		};
		
		this.teamsByName[WhiteTeam.name].opposition = this.teamsByName[BlackTeam.name];
		this.teamsByName[BlackTeam.name].opposition = this.teamsByName[WhiteTeam.name];
		
		const FENparts = FENString.split(" ");
		
		//populate the board with pieces from the 1st part of the FEN string
		const boardString = FENparts[0];
		
		const rankStrings = boardString.split("/");	//ranks are delimitted by "/" in FEN strings
		if(rankStrings.length!=NUM_RANKS){throw "invalid number of ranks in FEN string";}
		this.pieces = Array(NUM_RANKS*NUM_FILES).fill(null);
		rankStrings.reverse()	//ranks are in descending order in FEN strings, .reverse() for ascending order
		.forEach((rankString,rank)=>{
			let file=0;
			rankString.split("").forEach((character)=>{
				if(isNaN(character))	//character denotes a piece
				{
					const typeChar = Piece.typeCharOfTeamedChar(character);
					const pieceClass = PieceClassesByTypeChar[typeChar];
					
					if(!pieceClass)
					{
						throw "invalid piece type character in FEN string";
					}
					
					const teamClass = Team.classOfTeamedChar(character);
					const team = this.teamsByName[teamClass.name];
					
					const square = Square.withRankAndFile(rank,file);
					const piece = new pieceClass(this,team,square);
					
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
			if(file!=NUM_FILES){throw "invalid number of files in FEN string";}
		})
		
		//determine the moving team from the 2nd part of the FEN string
		if(FENparts[1]==WhiteTeam.char)
		{
			this.movingTeam = this.teamsByName[WhiteTeam.name];
		}
		else if(FENparts[1]==BlackTeam.char)
		{
			this.movingTeam = this.teamsByName[BlackTeam.name];
		}
		else
		{
			throw "invalid team's turn in FEN string";
		}
		
		//determine the castling rights from the 3rd part of the FEN string
		const castleRightsCharacters = FENparts[2].split("");
		//check for invalid castle rights characters
		if(castleRightsCharacters.some((teamedChar)=>{
			if(teamedChar==EMPTY_FEN_FIELD){return false;}
			const wingChar = Piece.typeCharOfTeamedChar(teamedChar);
			return !(WINGS.includes(wingChar));
		})){throw "invalid castle right in FEN string";}
		//check for duplicate castle rights characters
		const differentRights = castleRightsCharacters.reduce((accumulator, teamedChar)=>{
			if(teamedChar in accumulator){throw "duplicate castle rights in FEN string";}
			accumulator[teamedChar] = true;
			return accumulator;
		},{});
		
		if(FENparts[2]!=EMPTY_FEN_FIELD)
		{
			//rooks and kings already have canCastle true if they started in the right squares,
			//but if the castle rights aren't there then must update canCastle to reflect this
			Object.values(this.teamsByName).forEach((team)=>{
				let numRooksCanCastle = 0;
				//check each rook individually, if neither can castle then update the king, too
				WINGS.forEach((wing)=>{
					const rook = team.rooksInStartSquaresByWing[wing];
					if(rook)
					{
						const teamedWingChar = team.constructor.charConverter(wing);
						const hasRight = castleRightsCharacters.includes(teamedWingChar);

						const canCastle = rook.canCastle.get() && hasRight;
						rook.canCastle.update(canCastle);
						if(canCastle){numRooksCanCastle++;}
					}
				})
				if(numRooksCanCastle==0){team.king.canCastle.update(false);}
			})
		}

		//determine the possible en passant capture from the 4th part of the FEN string
		if(FENparts[3] != EMPTY_FEN_FIELD)
		{
			const distance = asciiDistance(FENparts[3], MIN_FILE);
			if((distance < 0) || (distance >= NUM_FILES))
			{
				console.log("en passant file:")
				console.log(FENparts[3]);
				throw "invalid en passant file in FEN string";
			}
		}
		this.enPassantable = new Manager(FENparts[3]);
		
		
		//determine the halfmove and fullmove clocks from the 5th and 6th parts of the FEN string respectively
		this.halfMove = new Manager(parseInt(FENparts[4]));
		if((this.halfMove.get() < 0) || (this.halfMove.get() > DRAW_AFTER_NO_PROGRESS_HALFMOVES) || isNaN(this.halfMove.get()))
		{
			throw "invalid halfmove clock in FEN string";
		}
		this.fullMove = parseInt(FENparts[5]);
		//calculating the fullmove clock's upper bound in a given position would be WAY too difficult
		//for not enough reward, so I am willing to allow impossible fullmove clocks
		if((this.fullMove <= 0) || isNaN(this.fullMove))
		{
			throw "invalid fullmove clock in FEN string";
		}
		
		this.teamsByName[WhiteTeam.name].init();
		this.teamsByName[BlackTeam.name].init();
		//the white king was updated before the black pieces had any moves
		//therefore, must update white king again to rule out moves based on enemy attacks
		this.teamsByName[WhiteTeam.name].updatePiece(this.teamsByName[WhiteTeam.name].king);
		
		this.movingPiece = new Manager();
		this.targetPiece = new Manager();
		
		this.positionFrequenciesByBoardString = {};
		
		this.playedMoves = [];
		this.fullUpdatedPieces = new Manager();
		
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
		return this.positionFrequenciesByBoardString[this.boardString()]==DRAW_BY_REPETITIONS;
	}
	
	isDrawByMoveRule()
	{
		return this.halfMove.get()==DRAW_AFTER_NO_PROGRESS_HALFMOVES;
	}
	
	immediatePositionScore()
	{		
		return (this.teamsByName[WhiteTeam.name].points*WhiteTeam.SCORE_MULTIPLIER) + 
				(this.teamsByName[BlackTeam.name].points*BlackTeam.SCORE_MULTIPLIER);
	}
	
	ABevaluate(depth, A=WhiteTeam.INF_SCORE, B=BlackTeam.INF_SCORE)
	{
		if(this.kingCapturable()){return {score:NaN};}
		if(depth==0){return {score:this.immediatePositionScore()};}
		if(this.isDrawByRepetition()){return {score:0};}
		if(this.isDrawByMoveRule()){return {score:0};}
		
		let bestContinuation;
		let bestEval = {score:this.movingTeam.opposition.constructor.INF_SCORE};		
			
		const moves = this.calculateMoves();

		mainLoop:
		for(const [basicMoves, specialMoves] of moves)
		{
			if(basicMoves.length>0)
			{
				const newContinuation = basicMoves[0];
				this.makeMove(newContinuation);
				const newEval = this.ABevaluate(depth-1,A,B);
				
				if(this.movingTeam.opposition.evalPreferredToEval(newEval,bestEval))
				{
					bestContinuation = newContinuation;
					bestEval = newEval;
				}
				if(this.movingTeam.opposition.evalPreferredToEval(bestEval, this.movingTeam.opposition instanceof WhiteTeam?B:A)){
					this.undoMove();
					break mainLoop;
				}
				if(this.movingTeam.opposition instanceof WhiteTeam){A = bestEval;}else{B = bestEval;}

				for(let i=1; i<basicMoves.length; i++)
				{
					const newContinuation = basicMoves[i];
					this.switchMoveBySamePiece(newContinuation);
					const newEval = this.ABevaluate(depth-1,A,B);
				
					if(this.movingTeam.opposition.evalPreferredToEval(newEval,bestEval))
					{
						bestContinuation = newContinuation;
						bestEval = newEval;
					}
					if(this.movingTeam.opposition.evalPreferredToEval(bestEval, this.movingTeam.opposition instanceof WhiteTeam?B:A)){
						this.undoMove();
						break mainLoop;
					}
					if(this.movingTeam.opposition instanceof WhiteTeam){A = bestEval;}else{B = bestEval;}
				}
				this.undoMove();				
			}

			for(let i=0; i<specialMoves?.length; i++)
			{
				const newContinuation = specialMoves[i];
				this.makeMove(newContinuation);
				const newEval = this.ABevaluate(depth-1,A,B);
				this.undoMove();
				
				if(this.movingTeam.evalPreferredToEval(newEval,bestEval))
				{
					bestContinuation = newContinuation;
					bestEval = newEval;
				}
				if(this.movingTeam.evalPreferredToEval(bestEval, this.movingTeam instanceof WhiteTeam?B:A)){break;}
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
	
	threadedABEvaluate(depth = DEFAULT_ANALYSIS_DEPTH)
	{
		const NUM_THREADS = Math.max(1, NUM_CPUs/2);

		this.numPositionsAnalysed++;
		if(this.kingCapturable()){return {score:NaN};}
		if(depth==0){return {score:this.immediatePositionScore()};}
		if(this.isDrawByRepetition()){return {score:0};}
		if(this.isDrawByMoveRule()){return {score:0};}
		const moves = this.calculateMoves().flat(2);
		
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
	
	updateMovingPieceAndOppositionPiecesSeeingMove(movingPiece, move)
	{
		
		const fullUpdatedPieces = [];
		
		//When the moving team makes a move, only need to update the opposition's available moves
		//to be able to expand the game tree search
		
		//This saves updating both teams on the last step when only one update is required
		//but requires also checking the previous move (for which this opposition was not updated)

		//e.g. white king moves to block white rook, only black pieces update,
		//then black makes a move which the same white rook does not see, so it does not update
		//then same white rook still thinks it can go through where the white king now is

		//also update the movingPiece and otherPiece while we know they need updating, in case
		//they miss the next move (and don't get updated)

		movingPiece.team.updatePiece(movingPiece);
		fullUpdatedPieces.push(movingPiece);
		const otherPiece = move.otherPiece;
		if(otherPiece){
			otherPiece.team.updatePiece(otherPiece);
			fullUpdatedPieces.push(otherPiece);
		}

		const previousMove = this.playedMoves[this.playedMoves.length-1] ?? new PlainMove(null,null,null);
		this.movingTeam.opposition.activePieces.forEach((piece)=>{
			if(piece instanceof King)
			{
				//Would be awkward to implement squaresWatchedBitVector64 for the King's castle moves
				//For now just fully update the King every move
				this.movingTeam.opposition.updatePiece(piece);
				fullUpdatedPieces.push(piece);
			}
			else
			{
				const watchingBits = piece.squaresWatchedBitVector.get();
				if
				(
					watchingBits.read(move.mainPieceSquareBefore) ||
					watchingBits.read(move.mainPieceSquareAfter) ||
					watchingBits.read(move.otherPieceSquareBefore) ||
					watchingBits.read(move.otherPieceSquareAfter) ||
					watchingBits.read(move.captureTargetSquare) ||
					watchingBits.read(previousMove.mainPieceSquareBefore) ||
					watchingBits.read(previousMove.mainPieceSquareAfter) ||
					watchingBits.read(previousMove.otherPieceSquareBefore) ||
					watchingBits.read(previousMove.otherPieceSquareAfter) ||
					watchingBits.read(previousMove.captureTargetSquare)
				)
				{
					this.movingTeam.opposition.updatePiece(piece);
					fullUpdatedPieces.push(piece);
				}
			}
		});
		
		this.fullUpdatedPieces.update(fullUpdatedPieces);
	}
	
	switchMoveBySamePiece(move)
	{
		//can skip moving the same piece back and then to a new square, just move to the new square
		
		this.positionFrequenciesByBoardString[this.boardString()]--;
		
		const lastMove = this.playedMoves.pop();
		const movingPiece = this.movingPiece.get();
		const lastTargetPiece = this.targetPiece.pop();
		
		this.fullUpdatedPieces.pop().forEach((piece)=>{piece.team.revertPiece(piece);});
		
		this.pieces[lastMove.captureTargetSquare] = lastTargetPiece;
		lastTargetPiece?.activate();
		
		const newTargetPiece = this.pieces[move.captureTargetSquare];
		this.pieces[move.captureTargetSquare] = null;
		newTargetPiece?.deactivate();
		
		movingPiece.square = move.mainPieceSquareAfter;
		this.pieces[move.mainPieceSquareAfter] = movingPiece;
		
		this.targetPiece.update(newTargetPiece);
		
		this.changeTurns();
		this.updateMovingPieceAndOppositionPiecesSeeingMove(movingPiece, move);
		this.changeTurns();
		
		this.playedMoves.push(move);
		
		const newBoardString = this.boardString();
		if(newBoardString in this.positionFrequenciesByBoardString)
		{
			this.positionFrequenciesByBoardString[newBoardString]++;
		}
		else
		{
			this.positionFrequenciesByBoardString[newBoardString] = 1;
		}
	}
	
	makeMove(move)
	{
		const targetPiece = this.pieces[move.captureTargetSquare];
		targetPiece?.deactivate();
		this.pieces[move.captureTargetSquare] = null;
		
		const movingPiece = this.pieces[move.mainPieceSquareBefore];
		movingPiece.square = move.mainPieceSquareAfter;
		this.pieces[move.mainPieceSquareAfter] = movingPiece;
		
		this.pieces[move.mainPieceSquareBefore] = null;
		
		const otherPiece = move.otherPiece;
		(otherPiece??{}).square = move.otherPieceSquareAfter;
		this.pieces[move.otherPieceSquareAfter] = otherPiece;
		
		this.pieces[move.otherPieceSquareBefore] = null;
		
		if(move instanceof PromotionMove)
		{
			movingPiece.team.swapOldPieceForNewPiece(movingPiece, otherPiece);
		}
		
		if((movingPiece instanceof King) || (movingPiece instanceof Rook))
		{
			movingPiece.canCastle.update(false);
			otherPiece?.canCastle.update(false);
		}
			
		if(movingPiece instanceof Pawn)
		{
			const beforeRank = Square.rank(move.mainPieceSquareBefore);
			const afterRank = Square.rank(move.mainPieceSquareAfter);
			const distance = afterRank-beforeRank;
			if((distance/Pawn.LONG_MOVE_RANK_INCREMENT_MULTIPLIER)==movingPiece.team.constructor.PAWN_RANK_INCREMENT)
			{
				this.enPassantable.update(asciiOffset(MIN_FILE, Square.file(move.mainPieceSquareAfter)));	//could have used move.before too
			}
			else
			{
				this.enPassantable.update("-");
			}
		}
		else
		{
			this.enPassantable.update("-");
		}
		
		this.movingPiece.update(movingPiece);
		this.targetPiece.update(targetPiece);
		
		this.updateMovingPieceAndOppositionPiecesSeeingMove(movingPiece, move);
		
		this.playedMoves.push(move);
		
		const nextHalfMove = ((movingPiece instanceof Pawn) || targetPiece)? 0 : this.halfMove.get()+1;
		this.halfMove.update(nextHalfMove);
		this.changeTurns();
		if(this.movingTeam==this.teamsByName[WhiteTeam.name]){this.fullMove++;}
		const boardString = this.boardString();
		if(boardString in this.positionFrequenciesByBoardString)
		{
			this.positionFrequenciesByBoardString[boardString]++;
		}
		else
		{
			this.positionFrequenciesByBoardString[boardString] = 1;
		}
	}
	
	undoMove()
	{
		this.positionFrequenciesByBoardString[this.boardString()]--;
		if(this.movingTeam==this.teamsByName[WhiteTeam.name]){this.fullMove--;}
		this.changeTurns();
		this.halfMove.revert();
		
		const move = this.playedMoves.pop();
		
		const movingPiece = this.movingPiece.pop();
		const targetPiece = this.targetPiece.pop();
		const otherPiece = move.otherPiece;
		
		const fullUpdatedPieces = this.fullUpdatedPieces.pop();
		fullUpdatedPieces.forEach((piece)=>{piece.team.revertPiece(piece);});
		
		this.enPassantable.revert();
		if((movingPiece instanceof King) || (movingPiece instanceof Rook)){
			movingPiece.canCastle.revert();
			otherPiece?.canCastle.revert();
		}
		
		if(move instanceof PromotionMove)
		{
			movingPiece.team.swapOldPieceForNewPiece(otherPiece, movingPiece);
		}
		
		this.pieces[move.otherPieceSquareBefore] = otherPiece;
		
		otherPiece?.canCastle?.revert();
		this.pieces[move.otherPieceSquareAfter] = null;
		(otherPiece??{}).square = move.otherPieceSquareBefore;
		
		this.pieces[move.mainPieceSquareBefore] = movingPiece;
		
		movingPiece.canCastle?.revert();
		this.pieces[move.mainPieceSquareAfter] = null;
		movingPiece.square = move.mainPieceSquareBefore;
		
		this.pieces[move.captureTargetSquare] = targetPiece;
		targetPiece?.activate();
	}
	
	calculateMoves()
	{
		const moves = [];
		
		this.movingTeam.activePieces.forEach((piece)=>{
			piece.addMovesToArray(moves);
		});
		return moves;
	}
	
	calculateLegals()
	{
		//moves are illegal if they leave the team's king vulnerable to capture
		return this.calculateMoves().flat(2).filter((move)=>{
			this.makeMove(move);
			const condition = !(this.kingCapturable());
			this.undoMove();
			return condition;
		});
	}
	
	kingCapturable()
	{	
		return this.movingTeam.numEnemyKingSeers > 0;
	}
	
	kingChecked()
	{
		return this.movingTeam.opposition.numEnemyKingSeers > 0;
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
			return accumulator.concat(` ${move.toString()}`);
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
			move.generateString();
			accumulator = accumulator.concat(move.toString());
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
		let castleRightsString = Object.values(this.teamsByName).reduce((accumulator, team)=>{
			if(team.king.canCastle.get())
			{
				WINGS.forEach((wing)=>{
					if(team.rooksInStartSquaresByWing[wing]?.canCastle.get())
					{
						accumulator.push(team.constructor.charConverter(wing));
					}
				})
			}
			return accumulator;
		}, []).sort().join("");
		if(castleRightsString==""){castleRightsString="-";}
		return [boardString, this.movingTeam.constructor.char, castleRightsString, this.enPassantable.get(), this.halfMove.get(), this.fullMove].join(" ");
	}
}

module.exports = {
	Game: Game
}