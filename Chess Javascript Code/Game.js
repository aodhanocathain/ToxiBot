const {Team, WhiteTeam, BlackTeam, TEAM_CLASSES} = require("./Team.js");
const {Piece, BlockablePiece, King, Queen, Rook, Pawn, PieceClassesByTypeChar} = require("./Piece.js");
const {asciiOffset, asciiDistance} = require("./Helpers.js");
const {NUM_RANKS, NUM_FILES, MIN_FILE} = require("./Constants.js");
const {PlainMove, CastleMove, EnPassantMove, PromotionMove} = require("./Move.js");
const {BitVector} = require("./BitVector.js");
const {Square} = require("./Square.js");
const {Manager} = require("./Manager.js");
const Canvas = require("canvas");

const DEFAULT_ANALYSIS_DEPTH = 2;
const FANCY_ANALYSIS_DEPTH = 3;
const DRAW_AFTER_NO_PROGRESS_HALFMOVES = 50*(TEAM_CLASSES.length);
const DRAW_BY_REPETITIONS = 3;
const EMPTY_FEN_FIELD = "-";

class Game
{	
	static DEFAULT_FEN_STRING = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";	//default game
	//static DEFAULT_FEN_STRING = "rnbqkbnr/8/8/8/8/8/8/RNBQKBNR w KQkq - 0 1";	//pawnless game
	
	//static DEFAULT_FEN_STRING = "4k3/6P1/8/8/8/8/1p6/4K3 w KQkq - 0 1";	//promotion test
	
	//static DEFAULT_FEN_STRING = "rnbqkbnr/ppp2ppp/4p3/3pP3/8/8/PPPP1PPP/RNBQKBNR w - d 0 3";	//en passant test
	//static DEFAULT_FEN_STRING = "4k3/8/4p3/3pP3/8/8/8/4K3 w - d 0 3";	//en passant test
		
	//static DEFAULT_FEN_STRING = "k7/8/K7/Q7/8/8/8/8 w KQkq - 0 1";	//checkmate test
	//static DEFAULT_FEN_STRING = "3k4/5Q2/K7/8/8/8/8/8 b - - 0 1";	//checkmate in 2 test
	//static DEFAULT_FEN_STRING = "b6K/4qq2/8/8/8/8/Q7/7k w KQkq - 0 1";	//stalemate test (queen sac)
	
	pieces;	//indexed by a square on the board
	squaresOccupiedBitVector;	//BitVector indicating whether a square is occupied with the bit at the square's index
	
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
		this.squaresOccupiedBitVector = new BitVector();
		
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
					this.squaresOccupiedBitVector.interact(BitVector.SET, square);
					
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
		this.teamsByName[WhiteTeam.name].init();
		this.teamsByName[BlackTeam.name].init();
		
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
			if((distance == 0) || (distance >= NUM_FILES))
			{
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
		
		this.movingPiece = new Manager();
		this.targetPiece = new Manager();
		
		this.positionFrequenciesByBoardString = {};
		
		this.playedMoves = [];
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
		//return {score: this.calculateMoves().length / this.movingTeam.points};
		//return {score: this.teamsByName[WhiteTeam.name].points - this.teamsByName[BlackTeam.name].points};
		const moves = [];
		
		this.movingTeam.activePieces.forEach((piece)=>{
			piece.addMovesToArray(moves);
		});
		return {score: (this.teamsByName[WhiteTeam.name].activePieces.reduce((accumulator, piece)=>{
			piece.addMovesToArray(accumulator);
			return accumulator;
		}, []).length / this.teamsByName[WhiteTeam.name].points) -	(this.teamsByName[BlackTeam.name].activePieces.reduce((accumulator, piece)=>{
			piece.addMovesToArray(accumulator);
			return accumulator;
		}, []).length / this.teamsByName[BlackTeam.name].points)};
	}

	fancyEvaluate(depth = FANCY_ANALYSIS_DEPTH)
	{
		if(this.movingTeam.numKingSeers>0){return;}
		if(this.isDrawByRepetition()){return {score:0};}
		if(this.isDrawByMoveRule()){return {score:0};}
		if(depth==0){
			return this.evaluate();
		}
		
		const legals = this.calculateLegals();
		const evaluationsOrderedByPreference = [];
		const legalIndicesOrderedByPreference = [];
		for(let i=0; i<legals.length; i++)
		{
			const legal = legals[i];
			
			this.makeMove(legal);
			const evaluation = this.evaluate(DEFAULT_ANALYSIS_DEPTH-1);
			this.undoMove();
			
			//insert evaluation into order at correct position
			let index=0;
			while(this.movingTeam.evalPreferredToEval(evaluationsOrderedByPreference[index],evaluation))
			{
				index++;
			}
			evaluationsOrderedByPreference.splice(index,0,evaluation);
			legalIndicesOrderedByPreference.splice(index,0,i);
		}
		
		let bestEval;
		let bestLegal;
		for(let i=0; i<Math.pow(evaluationsOrderedByPreference.length,1/3); i++)
		{
			const legal = legals[legalIndicesOrderedByPreference[i]];
			if(!legal){break;}
			this.makeMove(legal);
			const deeperEvaluation = this.fancyEvaluate(depth-1);
			this.undoMove();
			
			if(this.movingTeam.evalPreferredToEval(deeperEvaluation, bestEval))
			{
				bestEval = deeperEvaluation;
				bestLegal = legal;
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
		reverseLine.push(bestLegal);
		
		const checkmate = "checkmate_in_halfmoves" in bestEval;
		return {
			[checkmate? "checkmate_in_halfmoves" : "score"]: checkmate? bestEval.checkmate_in_halfmoves+1 : bestEval.score,
			bestMove: bestLegal,
			reverseLine: reverseLine
		};
	}

	evaluate(depth = DEFAULT_ANALYSIS_DEPTH)
	{
		if(this.movingTeam.numKingSeers>0){return;}
		if(this.isDrawByRepetition()){return {score:0};}
		if(this.isDrawByMoveRule()){return {score:0};}
		if(depth==0){
			return this.immediatePositionScore();
			/*
			return {
				score: this.teamsByName[WhiteTeam.name].points - this.teamsByName[BlackTeam.name].points
			}
			*/
		}
		const continuations = this.calculateMoves();
		
		let bestContinuation;
		let bestEval;
		
		//check for better continuations
		for(let i=0; i<continuations.length; i++)
		{
			//if(depth==DEFAULT_ANALYSIS_DEPTH){console.log(`${i}/${continuations.length}`)}
			const newContinuation = continuations[i];
			this.makeMove(newContinuation);
			const newEval = this.evaluate(depth-1);
			this.undoMove();
			if(this.movingTeam.evalPreferredToEval(newEval,bestEval))
			{
				bestContinuation = newContinuation;
				bestEval = newEval;
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
	
	makeMove(move)
	{
		let movingPiece = this.pieces[move.before];
		const targetPiece = this.pieces[ (move instanceof EnPassantMove)? move.captureSquare : move.after ];
		
		//move the moving piece
		movingPiece.square = move.after;
		//capture the target piece
		targetPiece?.deactivate();
		//manipulate the game position		
		this.pieces[move.after] = movingPiece;
		this.squaresOccupiedBitVector.interact(BitVector.SET, move.after);
		this.pieces[move.before] = null;
		this.squaresOccupiedBitVector.interact(BitVector.CLEAR, move.before);
		if(move instanceof EnPassantMove)
		{
			this.pieces[move.captureSquare] = null;
			this.squaresOccupiedBitVector.interact(BitVector.CLEAR, move.captureSquare);
		}
			
		if(movingPiece instanceof King || movingPiece instanceof Rook)
		{
			movingPiece.canCastle?.update(false);
		}
		
		if(move instanceof CastleMove)
		{
			const rook = this.pieces[move.rookBefore];
			rook.square = move.rookAfter;
			this.pieces[move.rookAfter] = rook;
			this.squaresOccupiedBitVector.interact(BitVector.SET, move.rookAfter);
			this.pieces[move.rookBefore] = null;
			this.squaresOccupiedBitVector.interact(BitVector.CLEAR, move.rookBefore);
			
			rook.canCastle.update(false);
		}
		
		this.castleRights.update(
			this.castleRights.get().filter((teamedChar)=>{
				const wingChar = Piece.typeCharOfTeamedChar(teamedChar);
				
				const teamClass = Team.classOfTeamedChar(teamedChar);
				const team = this.teamsByName[teamClass.name];
				
				const king = team.king;
				const rook = team.rooksInStartSquaresByWingChar[wingChar];
				
				if(!((king.canCastle.get()) && (rook?.isActive()) && (rook.canCastle.get())))
				{
					//console.log(`${wingChar}`);
					//console.log(`${king.canCastle.get()} && ${rook?.isActive()} && ${rook.canCastle.get()}`);
				}
				return (king.canCastle.get()) && (rook?.isActive()) && (rook.canCastle.get());
				//return true;
			})
		);
			
		if(movingPiece instanceof Pawn)
		{
			const beforeRank = Square.rank(move.before);
			const afterRank = Square.rank(move.after);
			const distance = afterRank-beforeRank;
			if((distance/Pawn.LONG_MOVE_RANK_INCREMENT_MULTIPLIER)==movingPiece.team.constructor.PAWN_RANK_INCREMENT)
			{
				this.enPassantable.update(asciiOffset(MIN_FILE, Square.file(move.after)));	//could have used move.before too
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
		
		//selectively update pieces whose ranges could have been altered by the move
		//i.e. direction pieces that saw the move squares change
		//all pieces still have to update whether they can see the enemy king
		
		[this.movingTeam, this.movingTeam.opposition].forEach((team)=>{
			team.activePieces.forEach((piece)=>{
				if((piece==movingPiece) || (piece==this.pieces[move.rookAfter]))
				{
					piece.updateKnowledge();
				}
				else if(piece instanceof BlockablePiece)
				{
					const watchingBits = piece.watchingBits.get();
					if
					(
						watchingBits.interact(BitVector.READ, move.before) ||
						watchingBits.interact(BitVector.READ, move.after)
					)
					{
						piece.updateKnowledge();
					}
					else if(piece instanceof Pawn)
					{
						piece.updateKingSeer();
					}
				}
				else
				{
					piece.updateKingSeer();
				}
			});
		});
		
		if(move instanceof PromotionMove)
		{
			const promotedPiece = new (move.promotionClass)(movingPiece.game, movingPiece.team, movingPiece.square);
			promotedPiece.updateKnowledge();
			movingPiece.team.swapOldPieceForNewPiece(movingPiece, promotedPiece);
			this.pieces[move.after] = promotedPiece;
		}
		
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
		
		const move = this.playedMoves.pop();
		const movingPiece = this.movingPiece.get();
		const targetPiece = this.targetPiece.get();
		
		if(move instanceof PromotionMove)
		{
			const promotedPiece = movingPiece.team.activePieces[movingPiece.id];
			movingPiece.team.swapOldPieceForNewPiece(promotedPiece, movingPiece);
		}
		
		//move the moving piece back where it came from
		movingPiece.square = move.before;
		
		//revoke the capture of the target piece AFTER reverting knowledge
		//because the target piece may be reverted in error (could not have updated in makeMove)
		//targetPiece?.activate();
		
		if(movingPiece instanceof King || movingPiece instanceof Rook)
		{
			movingPiece.canCastle?.revert();
		}
		
		if(move instanceof CastleMove)
		{
			const rook = this.pieces[move.rookAfter];
			rook.square = move.rookBefore;
			this.pieces[move.rookBefore] = rook;
			this.squaresOccupiedBitVector.interact(BitVector.SET, move.rookBefore);
			this.pieces[move.rookAfter] = null;
			this.squaresOccupiedBitVector.interact(BitVector.CLEAR, move.rookAfter);
			
			rook.canCastle.revert();
		}
		
		//manipulate the game position
		this.pieces[move.before] = movingPiece;
		this.squaresOccupiedBitVector.interact(BitVector.SET, move.before);
		if(move instanceof EnPassantMove)
		{
			this.pieces[move.captureSquare] = targetPiece;
			this.pieces[move.after] = null;
			this.squaresOccupiedBitVector.interact(BitVector.SET, move.captureSquare);
			this.squaresOccupiedBitVector.interact(BitVector.CLEAR, move.after);
		}
		else
		{
			this.pieces[move.after] = targetPiece;
			if(!targetPiece){this.squaresOccupiedBitVector.interact(BitVector.CLEAR, move.after);}			
		}
		
		//revert the game state
		this.castleRights.revert();
		this.enPassantable.revert();
		this.movingPiece.revert();
		this.targetPiece.revert();
		
		//selectively revert pieces the pieces that were updated in makeMove		
		[this.movingTeam, this.movingTeam.opposition].forEach((team)=>{
			team.activePieces.forEach((piece)=>{
				if((piece==movingPiece) || (piece==this.pieces[move.rookBefore]))
				{
					piece.revertKnowledge();
				}
				else if(piece instanceof BlockablePiece)
				{
					const watchingBits = piece.watchingBits.get();
					if
					(
						watchingBits.interact(BitVector.READ, move.before) ||
						watchingBits.interact(BitVector.READ, move.after)
					)
					{
						piece.revertKnowledge();
					}
					else if(piece instanceof Pawn)
					{
						piece.revertKingSeer();
					}
				}
				else
				{
					piece.revertKingSeer();
				}
			});
		});
					
		//NOW revoke the capture of the target piece
		targetPiece?.activate();
		
		this.halfMove.revert();
		if(this.movingTeam==this.teamsByName[WhiteTeam.name]){this.fullMove--;}
		this.changeTurns();
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
		if(this.isDrawByMoveRule()){return [];}
		if(this.isDrawByRepetition()){return [];}
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