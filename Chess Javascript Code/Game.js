const {NUM_RANKS, NUM_FILES, MIN_FILE} = require("./Constants.js");
const {asciiOffset, asciiDistance, deferredPromise} = require("./Helpers.js");
const {BitVector} = require("./BitVector.js");
const {Manager} = require("./Manager.js");
const {Square} = require("./Square.js");
const {PromotionMove} = require("./Move.js");
const {Team, WhiteTeam, BlackTeam} = require("./Team.js");
const {Piece, King, Queen, Rook, Pawn, PieceClassesByTypeChar} = require("./Piece.js");

const {Worker, isMainThread, parentPort} = require("worker_threads");

const numCPUs = require("os").cpus().length;

const DEFAULT_ANALYSIS_DEPTH = 1;

//fancy analysis time is approximately (branch factor)^(depth + foresight) but foresight is more expensive than depth
const FANCY_ANALYSIS_DEPTH = 3;
const FANCY_ANALYSIS_FORESIGHT = 1;
const FANCY_ANALYSIS_BRANCH_FACTOR = 4;

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
	
	castleRights;
	enPassantable;
	movingPiece;
	targetPiece;
	
	fullUpdatedPieces;
	partUpdatedPieces;
	
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
			return (wingChar != King.typeChar) && (wingChar != Queen.typeChar);
		})){throw "invalid castle right in FEN string";}
		//check for duplicate castle rights characters
		const differentRights = castleRightsCharacters.reduce((accumulator, teamedChar)=>{
			if(teamedChar in accumulator){throw "duplicate castle rights in FEN string";}
			accumulator[teamedChar] = true;
			return accumulator;
		},{});
		//only accept the castle rights characters if the corresponding pieces are in their starting squares
		//(if they are not in their starting squares, they have moved and could not be able to castle)
		this.castleRights = new Manager(
			FENparts[2]==EMPTY_FEN_FIELD? [] : 
			castleRightsCharacters.filter((teamedChar)=>{
				const wingChar = Piece.typeCharOfTeamedChar(teamedChar);
				const teamClass = Team.classOfTeamedChar(teamedChar);
				const team = this.teamsByName[teamClass.name];
				return (team.king.canCastle.get()) && (team.rooksInStartSquaresByWingChar[wingChar]?.canCastle.get());
			})
		);
		
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
		
		this.movingPiece = new Manager();
		this.targetPiece = new Manager();
		
		this.positionFrequenciesByBoardString = {};
		
		this.playedMoves = [];
		this.fullUpdatedPieces = new Manager();
		this.partUpdatedPieces = new Manager();
		
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
	
	immediatePositionEvaluation()
	{
		///*
		const whiteMaterial = this.teamsByName[WhiteTeam.name].points;
		const blackMaterial = this.teamsByName[BlackTeam.name].points;
		const totalMaterial = whiteMaterial + blackMaterial;
		
		return {
			score: ((whiteMaterial-blackMaterial)/totalMaterial)
		};
		//*/
		/*
		return {
			score: this.teamsByName[WhiteTeam.name].points - this.teamsByName[BlackTeam.name].points
		};
		*/
	}

	fancyEvaluate(depth = FANCY_ANALYSIS_DEPTH)
	{
		/*
		Generally, some good continuations are easy to spot early.
		fancyEvaluate uses a shortsighted evaluation to rate each available move,
		then it only expands the best continuations.
		The idea is that this would direct a greater proportion of the
		search time into worthwhile continuations.
		*/
		if(this.kingCapturable()){return;}
		if(depth==0){
			return this.evaluate(FANCY_ANALYSIS_FORESIGHT) ?? {};
		}
		if(this.isDrawByRepetition()){return {score:0};}
		if(this.isDrawByMoveRule()){return {score:0};}
		
		//better to iterate through legals than unverified moves because
		//1) it is easier
		//2) if the "best" unverified moves are illegal then this function will return no best move
		//even if there is a legal move in the position
		//The above is not a problem in regular evaluate because all moves are checked
		const legals = this.calculateLegals();
		//evaluate available continuations and order them by the moving team's preference
		const evaluations = legals.map((legal, index)=>{
			this.makeMove(legal);
			const evaluation = this.evaluate(FANCY_ANALYSIS_FORESIGHT) ?? {};
			evaluation.move = legal;
			this.undoMove();
			return evaluation;
		})
		
		//sort by preference of the moving team
		mergeSortEvaluations(evaluations, 0, evaluations.length, this.movingTeam);
		
		let bestEval;
		let bestMove;
		
		//only expand the few best continuations
		const numBestEvaluations = Math.min(FANCY_ANALYSIS_BRANCH_FACTOR, legals.length);
		for(let i=0; i<numBestEvaluations; i++)
		{
			const move = evaluations[i].move;
			if(!move){break;}
			this.makeMove(move);
			const deeperEvaluation = this.fancyEvaluate(depth-1);
			this.undoMove();
			
			if(this.movingTeam.evalPreferredToEval(deeperEvaluation, bestEval))
			{
				bestEval = deeperEvaluation;
				bestMove = move;
			}
		}
		
		if(!bestEval)
		{
			//No VALID continuation found, i.e. can't make a move without leaving king vulnerable.
			//This means the current position is either checkmate or stalemate against movingTeam
			return (this.kingChecked())?
			{
				checkmate_in_halfmoves: 0
			}:
			{
				score: 0
			};
		}
		
		const reverseLine = bestEval.reverseLine ?? [];
		reverseLine.push(bestMove);
		
		const checkmate = "checkmate_in_halfmoves" in bestEval;
		return {
			[checkmate? "checkmate_in_halfmoves" : "score"]: checkmate? bestEval.checkmate_in_halfmoves+1 : bestEval.score,
			bestMove: bestMove,
			reverseLine: reverseLine
		};
	}

	evaluate(depth = DEFAULT_ANALYSIS_DEPTH)
	{
		this.numPositionsAnalysed++;
		if(this.kingCapturable()){return;}
		if(depth==0){
			return this.immediatePositionEvaluation();
		}
		if(this.isDrawByRepetition()){return {score:0};}
		if(this.isDrawByMoveRule()){return {score:0};}
		const continuations = this.calculateMoves();
		
		let bestContinuation;
		let bestEval;
		
		//check for better continuations
		
		//basic moves by the same piece are swappable, special moves are not
		for(const [basicMoves,specialMoves] of continuations)
		{
			if(basicMoves?.length>0)
			{
				const newContinuation = basicMoves[0];
				this.makeMove(newContinuation);
				const newEval = this.evaluate(depth-1);
				//not undoing move, must use movingTeam.opposition
				if(this.movingTeam.opposition.evalPreferredToEval(newEval,bestEval))
				{
					bestContinuation = newContinuation;
					bestEval = newEval;
				}
				
				//swap basic moves (faster than undoing and making the next move)
				for(let i=1; i<basicMoves.length; i++)
				{
					const newContinuation = basicMoves[i];
					this.switchMoveBySamePiece(newContinuation);
					const newEval = this.evaluate(depth-1);
					if(this.movingTeam.opposition.evalPreferredToEval(newEval,bestEval))
					{
						bestContinuation = newContinuation;
						bestEval = newEval;
					}
				}
				this.undoMove();
			}
			
			//make and take back individual special moves
			for(let i=0; i<specialMoves?.length; i++)
			{
				const newContinuation = specialMoves[i];
				this.makeMove(newContinuation);
				const newEval = this.evaluate(depth-1);
				this.undoMove();
				if(this.movingTeam.evalPreferredToEval(newEval,bestEval))
				{
					bestContinuation = newContinuation;
					bestEval = newEval;
				}
			}
		}
		
		if(!bestEval)
		{
			//No VALID continuation found, i.e. can't make a move without leaving king vulnerable.
			//This means the current position is either checkmate or stalemate against movingTeam
			return (this.kingChecked())?
			{
				checkmate_in_halfmoves: 0
			}:
			{
				score: 0
			};
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
	
	threadedEvaluate(depth = DEFAULT_ANALYSIS_DEPTH)
	{
		const NUM_THREADS = Math.max(1, numCPUs-1);
		
		if(this.kingCapturable()){return;}
		if(depth==0){
			return this.immediatePositionEvaluation();
		}
		if(this.isDrawByRepetition()){return {score:0};}
		if(this.isDrawByMoveRule()){return {score:0};}		
		
		const gameString = this.toString();
		const moves = this.calculateMoves().flat(2);
		
		//the available continuations will be divided among a number of threads
		const workers = Array(NUM_THREADS).fill(null).map((item)=>{return new Worker("./Chess Javascript Code/GameEvaluatorThread.js");});
		const threadStatusObjects = workers.map((worker)=>{return deferredPromise();});
		const threadStatusPromises = threadStatusObjects.map((statusObject)=>{return statusObject.promise;});
		
		const choosingTeam = this.movingTeam;
		let bestEval;
		let bestIndex;
		
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
					const evaluation = this.evaluate(depth-1);
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
		
			const checkmate = "checkmate_in_halfmoves" in bestEval;
			return {
				[checkmate? "checkmate_in_halfmoves" : "score"]: checkmate? bestEval.checkmate_in_halfmoves+1 : bestEval.score,
				bestMove: bestContinuation,
				reverseLine: reverseLine
			};
		});
	}
	
	updateMovingPieceAndOppositionPiecesSeeingMove(movingPiece, move)
	{
		
		const fullUpdatedPieces = [];
		const partUpdatedPieces = [];
		
		//When the moving team makes a move, only need to update the opposition's available moves
		//to be able to expand the game tree search
		
		//This saves updating both teams on the last step when only one update is required
		//but requires also checking the previous move (for which this opposition was not updated)
		
		//must update both teams if checking for mate etc
		[this.movingTeam.opposition, this.movingTeam].forEach((team)=>{
			team.activePieces.forEach((piece)=>{
				if((piece==movingPiece) || (piece==move.otherPiece))
				{
					piece.updateAllProperties();
					fullUpdatedPieces.push(piece);
				}
				else
				{
					const watchingBits = piece.squaresWatchedBitVector.get();
					if
					(
						watchingBits.read(move.mainPieceSquareBefore) ||
						watchingBits.read(move.mainPieceSquareAfter)
					)
					{
						piece.updateAllProperties();
						fullUpdatedPieces.push(piece);
					}
				}
			});
		});
		
		this.fullUpdatedPieces.update(fullUpdatedPieces);
		this.partUpdatedPieces.update(partUpdatedPieces);
	}
	
	switchMoveBySamePiece(move)
	{
		//can skip moving the same piece back and then to a new square, just move to the new square
		
		this.positionFrequenciesByBoardString[this.boardString()]--;
		
		const lastMove = this.playedMoves.pop();
		const movingPiece = this.movingPiece.get();
		const lastTargetPiece = this.targetPiece.pop();
		
		this.fullUpdatedPieces.pop().forEach((piece)=>{piece.revertAllProperties();});
		this.partUpdatedPieces.pop().forEach((piece)=>{piece.revertSightOfEnemyKing();});
		
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
		movingPiece.canCastle?.update(false);
		
		this.pieces[move.mainPieceSquareBefore] = null;
		
		const otherPiece = move.otherPiece;
		(otherPiece??{}).square = move.otherPieceSquareAfter;
		this.pieces[move.otherPieceSquareAfter] = otherPiece;
		otherPiece?.canCastle?.update(false);
		
		this.pieces[move.otherPieceSquareBefore] = null;
		
		if(move instanceof PromotionMove)
		{
			movingPiece.team.swapOldPieceForNewPiece(movingPiece, otherPiece);
		}
		
		if((movingPiece instanceof King) || (movingPiece instanceof Rook))
		{
			this.castleRights.update(
				this.castleRights.get().filter((teamedChar)=>{
					const wingChar = Piece.typeCharOfTeamedChar(teamedChar);
					
					const teamClass = Team.classOfTeamedChar(teamedChar);
					const team = this.teamsByName[teamClass.name];
					
					const king = team.king;
					const rook = team.rooksInStartSquaresByWingChar[wingChar];
					
					return (king.canCastle.get()) && (rook?.isActive()) && (rook.canCastle.get());
				})
			);
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
		fullUpdatedPieces.forEach((piece)=>{piece.revertAllProperties();});
		const partUpdatedPieces = this.partUpdatedPieces.pop();
		partUpdatedPieces.forEach((piece)=>{piece.revertSightOfEnemyKing();});
		
		this.enPassantable.revert();
		if((movingPiece instanceof King) || (movingPiece instanceof Rook)){this.castleRights.revert();}
		
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
			move.takeStringSnapshot();
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
		let castleRightsString = this.castleRights.get().join("");
		if(castleRightsString==""){castleRightsString="-";}
		return [boardString, this.movingTeam.constructor.char, castleRightsString, this.enPassantable.get(), this.halfMove.get(), this.fullMove].join(" ");
	}
}

module.exports = {
	Game: Game
}