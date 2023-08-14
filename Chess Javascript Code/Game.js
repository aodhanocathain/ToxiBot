const {Team, WhiteTeam, BlackTeam, TEAM_CLASSES} = require("./Team.js");
const {Piece, BlockablePiece, King, Queen, Rook, Pawn, PieceClassesByTypeChar} = require("./Piece.js");
const {asciiOffset, asciiDistance} = require("./Helpers.js");
const {NUM_RANKS, NUM_FILES, MIN_FILE} = require("./Constants.js");
const {PlainMove, CastleMove, EnPassantMove, PromotionMove} = require("./Move.js");
const {BitVector} = require("./BitVector.js");
const {Square} = require("./Square.js");
const {Manager} = require("./Manager.js");
const Canvas = require("canvas");

const DEFAULT_ANALYSIS_DEPTH = 3;
const FANCY_ANALYSIS_DEPTH = 3;
const FANCY_ANALYSIS_FORESIGHT = 1;

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
	//static DEFAULT_FEN_STRING = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";	//default game
	
	//static DEFAULT_FEN_STRING = "rnbqkbnr/8/8/8/8/8/8/RNBQKBNR w KQkq - 0 1";	//king,knight,bishop,rook,queen game
	//static DEFAULT_FEN_STRING = "rnb1kbnr/8/8/8/8/8/8/RNB1KBNR w KQkq - 0 1";	//king,knight,bishop,rook game
	//static DEFAULT_FEN_STRING = "1nb1kbn1/8/8/8/8/8/8/1NB1KBN1 w KQkq - 0 1";	//king,knight,bishop game
	//static DEFAULT_FEN_STRING = "1n2k1n1/8/8/8/8/8/8/1N2K1N1 w KQkq - 0 1";	//king,knight game
	//static DEFAULT_FEN_STRING = "4k3/8/8/8/8/8/8/4K3 w KQkq - 0 1";	//king game
	
	//static DEFAULT_FEN_STRING = "8/4Br2/8/8/8/8/p1P5/k1Kb4 w - - 0 1";	//win the rook in 9ish halfmoves
	
	//static DEFAULT_FEN_STRING = "4k3/6P1/8/8/8/8/1p6/4K3 w KQkq - 0 1";	//promotion test
	//static DEFAULT_FEN_STRING = "4k3/6P1/8/8/8/8/1p6/B3K3 b KQkq - 0 1";	//capture with promotion test
	
	//static DEFAULT_FEN_STRING = "rnbqkbnr/ppp2ppp/4p3/3pP3/8/8/PPPP1PPP/RNBQKBNR w - d 0 3";	//en passant test
	//static DEFAULT_FEN_STRING = "4k3/8/4p3/3pP3/8/8/8/4K3 w - d 0 3";	//en passant test
		
	//static DEFAULT_FEN_STRING = "k7/8/K7/Q7/8/8/8/8 w KQkq - 0 1";	//white gives checkmate in 1 test (evaluate at 1)
	//static DEFAULT_FEN_STRING = "3k4/5Q2/K7/8/8/8/8/8 b - - 0 1";	//white gives checkmate in 2 test (evaluate at 5)
	static DEFAULT_FEN_STRING = "b6K/4qq2/8/8/8/8/Q7/7k w KQkq - 0 1";	//stalemate test (queen sac) (evaluate at 3)
	
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
		catch
		{
			return false;
		}
	}
	
	constructor(FENString)
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
					
					const square = Square.make(rank,file);
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
		const whiteMaterial = this.teamsByName[WhiteTeam.name].points;
		const blackMaterial = this.teamsByName[BlackTeam.name].points;
		const totalMaterial = whiteMaterial + blackMaterial;
		
		const whitePieceQuality = this.teamsByName[WhiteTeam.name].pieceQuality;
		const blackPieceQuality = this.teamsByName[BlackTeam.name].pieceQuality;
		const totalPieceQuality = whitePieceQuality + blackPieceQuality;
		
		const whiteKingSafety = this.teamsByName[WhiteTeam.name].kingSafety;
		const blackKingSafety = this.teamsByName[BlackTeam.name].kingSafety;
		const totalKingSafety = whiteKingSafety + blackKingSafety;
		return {
			score: ((33/100)*((whiteMaterial-blackMaterial)/totalMaterial)) +
					((33/100)*((whitePieceQuality-blackPieceQuality)/totalPieceQuality)) +
					((33/100)*((whiteKingSafety-blackKingSafety)/totalKingSafety))
		};
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
		fancyEvaluate uses a shortsighted regular evaluate function to rate each available move,
		then it selects some of the best to expand the search further.
		The idea is that this would direct a greater proportion of the
		search time into worthwhile continuations.
		*/
		if(this.kingCapturable()){return;}
		if(this.isDrawByRepetition()){return {score:0};}
		if(this.isDrawByMoveRule()){return {score:0};}
		if(depth==0){
			return this.immediatePositionEvaluation();
		}
		
		const moves = this.calculateMoves();		
		const evaluations = [];
		
		//evaluate available continuations and order them by the moving team's preference
		
		let moveIndex=0;
		for(const [basicMoves,specialMoves] of moves)
		{
			if(basicMoves?.length>0)
			{
				let newContinuation = basicMoves[0];
				this.makeMove(newContinuation);
				let evaluation = this.evaluate(FANCY_ANALYSIS_FORESIGHT) ?? {};
				evaluation.move = newContinuation;
				evaluations[moveIndex++] = evaluation;
				
				//swap basic moves
				for(let i=1; i<basicMoves.length; i++)
				{
					newContinuation = basicMoves[i];
					this.switchMoveBySamePiece(newContinuation);
					evaluation = this.evaluate(FANCY_ANALYSIS_FORESIGHT) ?? {};
					evaluation.move = newContinuation;
					evaluations[moveIndex++] = evaluation;
				}
				this.undoMove();
			}
			
			//make and take back individual special moves
			for(let i=0; i<specialMoves?.length; i++)
			{
				const newContinuation = specialMoves[i];
				this.makeMove(newContinuation);
				const evaluation = this.evaluate(FANCY_ANALYSIS_FORESIGHT) ?? {};
				evaluation.move = newContinuation;
				evaluations[moveIndex++] = evaluation;
				this.undoMove();
			}
		}
		
		mergeSortEvaluations(evaluations, 0, evaluations.length, this.movingTeam);
		
		let bestEval;
		let bestMove;
		
		//only expand the few best continuations
		//const numBestEvaluations = Math.pow(evaluations.length,1/2);	//square root of total number
		const numBestEvaluations = 3;
		
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
			return (this.movingTeam.opposition.numKingSeers>0)?
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
		if(this.isDrawByRepetition()){return {score:0};}
		if(this.isDrawByMoveRule()){return {score:0};}
		if(depth==0){
			return this.immediatePositionEvaluation();
		}
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
				
				//swap basic moves
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
			return (this.movingTeam.opposition.numKingSeers>0)?
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
	
	updateMovingPieceAndPiecesSeeingMove(movingPiece, move)
	{
		const fullUpdatedPieces = [];
		const partUpdatedPieces = [];
		
		//update opposition first because current castle legality depends on opponent squares
		[this.movingTeam.opposition, this.movingTeam].forEach((team)=>{
			team.activePieces.forEach((piece)=>{
				if((piece==movingPiece) || (piece==move.otherPiece))
				{
					piece.updateKnowledge();
					fullUpdatedPieces.push(piece);
				}
				else
				{
					const watchingBits = piece.watchingBits.get();
					if
					(
						watchingBits.interact(BitVector.READ, move.mainBefore) ||
						watchingBits.interact(BitVector.READ, move.mainAfter)
					)
					{
						piece.updateKnowledge();
						fullUpdatedPieces.push(piece);
					}
					else if(piece instanceof Pawn)
					{
						piece.updateKingSeer();
						partUpdatedPieces.push(piece);
					}
				}
			});
		});
		
		this.fullUpdatedPieces.update(fullUpdatedPieces);
		this.partUpdatedPieces.update(partUpdatedPieces);
	}
	
	switchMoveBySamePiece(move)
	{
		this.positionFrequenciesByBoardString[this.boardString()]--;
		
		const lastMove = this.playedMoves.pop();
		const movingPiece = this.movingPiece.get();
		const lastTargetPiece = this.targetPiece.pop();
		
		this.fullUpdatedPieces.pop().forEach((piece)=>{piece.revertKnowledge();});
		this.partUpdatedPieces.pop().forEach((piece)=>{piece.revertKingSeer();});
		
		this.pieces[lastMove.targetSquare] = lastTargetPiece;
		lastTargetPiece?.activate();
		
		const newTargetPiece = this.pieces[move.targetSquare];
		this.pieces[move.targetSquare] = null;
		newTargetPiece?.deactivate();
		
		movingPiece.square = move.mainAfter;
		this.pieces[move.mainAfter] = movingPiece;
		
		this.targetPiece.update(newTargetPiece);
		
		this.updateMovingPieceAndPiecesSeeingMove(movingPiece, move);
		
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
		const targetPiece = this.pieces[move.targetSquare];
		targetPiece?.deactivate();
		this.pieces[move.targetSquare] = null;
		
		const movingPiece = this.pieces[move.mainBefore];
		movingPiece.square = move.mainAfter;
		this.pieces[move.mainAfter] = movingPiece;
		movingPiece.canCastle?.update(false);
		
		this.pieces[move.mainBefore] = null;
		
		const otherPiece = move.otherPiece;
		(otherPiece??{}).square = move.otherAfter;
		this.pieces[move.otherAfter] = otherPiece;
		otherPiece?.canCastle?.update(false);
		
		this.pieces[move.otherBefore] = null;
		
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
			const beforeRank = Square.rank(move.mainBefore);
			const afterRank = Square.rank(move.mainAfter);
			const distance = afterRank-beforeRank;
			if((distance/Pawn.LONG_MOVE_RANK_INCREMENT_MULTIPLIER)==movingPiece.team.constructor.PAWN_RANK_INCREMENT)
			{
				this.enPassantable.update(asciiOffset(MIN_FILE, Square.file(move.mainAfter)));	//could have used move.before too
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
		
		this.updateMovingPieceAndPiecesSeeingMove(movingPiece, move);
		
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
		fullUpdatedPieces.forEach((piece)=>{piece.revertKnowledge();});
		const partUpdatedPieces = this.partUpdatedPieces.pop();
		partUpdatedPieces.forEach((piece)=>{piece.revertKingSeer();});
		
		this.enPassantable.revert();
		if((movingPiece instanceof King) || (movingPiece instanceof Rook)){this.castleRights.revert();}
		
		if(move instanceof PromotionMove)
		{
			movingPiece.team.swapOldPieceForNewPiece(otherPiece, movingPiece);
		}
		
		this.pieces[move.otherBefore] = otherPiece;
		
		otherPiece?.canCastle?.revert();
		this.pieces[move.otherAfter] = null;
		(otherPiece??{}).square = move.otherBefore;
		
		this.pieces[move.mainBefore] = movingPiece;
		
		movingPiece.canCastle?.revert();
		this.pieces[move.mainAfter] = null;
		movingPiece.square = move.mainBefore;
		
		this.pieces[move.targetSquare] = targetPiece;
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
		return this.movingTeam.numKingSeers > 0;
	}
	
	kingChecked()
	{
		return this.movingTeam.opposition.numKingSeers > 0;
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
		return descendingRankStrings.join("/");
	}
	
	toString()	//specifically to a FEN string
	{
		const boardString = this.boardString();
		let castleRightsString = this.castleRights.get().join("");
		if(castleRightsString==""){castleRightsString="-";}
		return [boardString, this.movingTeam.constructor.char, castleRightsString, this.enPassantable.get(), this.halfMove.get(), this.fullMove].join(" ");
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
				//the game's square corresponding at the current draw position depends on the moving team (POV)
				const realRank = (this.movingTeam instanceof WhiteTeam)? (NUM_RANKS-1)-drawRank : drawRank;
				const realFile = (this.movingTeam instanceof WhiteTeam)? drawFile : (NUM_FILES-1)-drawFile;
				const square = Square.make(realRank,realFile);
				
				const x = drawFile*SQUARE_PIXELS;
				const y = drawRank*SQUARE_PIXELS;
				
				//colour the square
				const defaultColour = (((realRank+realFile)%2) == 0) ?  DARK_COLOUR : LIGHT_COLOUR;
				
				const fillColour = ((square == lastMove.mainBefore) || (square == lastMove.pieceEndSquare?.()))?
				(this.movingTeam.opposition.constructor.MOVE_COLOUR) : defaultColour;
				
				const borderColour = ((square == lastLastMove.mainBefore) || (square == lastLastMove.pieceEndSquare?.()))?
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