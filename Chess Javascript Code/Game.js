const {Team, WhiteTeam, BlackTeam, TEAM_CLASSES} = require("./Team.js");
const {Piece, PatternPiece, DirectionPiece, PieceClassesByTypeChar, King, Queen} = require("./Piece.js");

const {asciiDistance} = require("./Helpers.js");
const {NUM_RANKS, NUM_FILES, MIN_FILE} = require("./Constants.js");
const {PlainMove} = require("./Move.js");
const {BitVector} = require("./BitVector.js");
const {Square} = require("./Square.js");
const {Manager} = require("./Manager.js");

const Canvas = require("canvas");

const DEFAULT_ANALYSIS_DEPTH = 3;

const EMPTY_FEN_FIELD = "-";

const STARTING_KING_SQUARES_BY_TEAM_NAME = {
	[WhiteTeam.name] : Square.make(0,4),
	[BlackTeam.name] : Square.make(NUM_RANKS-1,4),
};

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
			if(file!=NUM_FILES){throw "invalid number of files in FEN string";}
		})
		this.teamsByName[WhiteTeam.name].init();
		this.teamsByName[BlackTeam.name].init();
		
		//determine the moving team from the 2nd part of the FEN string
		if(FENparts[1]==WhiteTeam.char)
		{
			this.movingTeam = this.teamsByName[WhiteTeam.name];
		}
		else if(FENparts[2]==BlackTeam.char)
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
		this.castleRights = new Manager(
			FENparts[2]==EMPTY_FEN_FIELD? [] : 
			castleRightsCharacters.filter((teamedChar)=>{
				const wingChar = Piece.typeCharOfTeamedChar(teamedChar);
				const teamClass = Team.classOfTeamedChar(teamedChar);
				const team = this.teamsByName[teamClass.name];
				const startingKingSquare = STARTING_KING_SQUARES_BY_TEAM_NAME[teamClass.name];
				return (team.rooksInDefaultSquaresByStartingWingChar[wingChar]) && (team.king.square==startingKingSquare);
			})
		);

		//determine the possible en passant capture from the 4th part of the FEN string
		if(FENparts[3] != EMPTY_FEN_FIELD)
		{
			const distance = asciiDistance(FENparts[3], MIN_FILE) < NUM_FILES;
			if((distance == 0) || (distance >= NUM_FILES))
			{
				throw "invalid en passant file in FEN string";
			}
		}
		this.enPassantable = new Manager(FENparts[3]);
		
		
		//determine the halfmove and fullmove clocks from the 5th and 6th parts of the FEN string respectively
		this.halfMove = parseInt(FENparts[4]);
		if((this.halfMove < 0) || (this.halfMove > 1) || isNaN(this.halfMove))
		{
			throw "invalid halfmove clock in FEN string";
		}
		this.fullMove = parseInt(FENparts[5]);
		//programming a calculation of the fullmove clock's upper bound in a given position would take WAY too long,
		//for not enough reward, so I am willing to allow impossible fullmove clocks
		if((this.fullMove <= 0) || isNaN(this.fullMove))
		{
			console.log(this.fullMove);
			console.log(typeof this.fullMove);
			throw "invalid fullmove clock in FEN string";
		}
		
		this.movingPiece = new Manager();
		this.targetPiece = new Manager();
		this.firstMove = new Manager();
		
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

	evaluate(depth = DEFAULT_ANALYSIS_DEPTH)
	{
		if(this.movingTeam.numKingSeers>0){return;}
		if(depth==0){
			return {
				score: this.teamsByName[WhiteTeam.name].points - this.teamsByName[BlackTeam.name].points
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
			
			this.firstMove.update(movingPiece.moved==false);
			movingPiece.moved = true;
			
			this.castleRights.update(
				this.castleRights.get().filter((teamedChar)=>{
					const teamClass = Team.classOfTeamedChar(teamedChar);
					const wingChar = Piece.typeCharOfTeamedChar(teamedChar);
					const rook = this.teamsByName[teamClass.name].rooksInDefaultSquaresByStartingWingChar[wingChar];
					if(movingPiece.team instanceof teamClass)	//could only change by the rook or king moving
					{
						return (rook.moved==false) && (rook.team.king.moved==false);
					}
					else	//could only change by being the rook being captured
					{
						return rook.isActive();
					}
				})
			);
			
			this.enPassantable.update("-");
			this.movingPiece.update(movingPiece);
			this.targetPiece.update(targetPiece);
			
			//selectively update pieces whose ranges could have been altered by the move
			//i.e. direction pieces that saw the move squares change
			//all pieces still have to update whether they can see the enemy king
			[this.movingTeam, this.movingTeam.opposition].forEach((team)=>{
				team.activePieces.forEach((piece)=>{
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
						}
					}
					else if(piece==movingPiece)
					{
						piece.updateReachableSquaresAndBitsAndKingSeer();
					}
					else
					{
						piece.updateKingSeer();
					}
				});
			});
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
			//NOT BEFORE REVERTING, do later
			//because the target piece may be reverted in error (could not have updated in makeMove)
			//targetPiece?.activate();
			
			//manipulate the game position
			this.pieces[move.before] = movingPiece;
			this.squaresOccupiedBitVector.interact(BitVector.SET, move.before);
			this.pieces[move.after] = targetPiece;
			if(!targetPiece){this.squaresOccupiedBitVector.interact(BitVector.CLEAR, move.after);}
			
			//revert the game state
			this.castleRights.revert();
			this.enPassantable.revert();
			this.movingPiece.revert();
			this.targetPiece.revert();
			movingPiece.moved = (this.firstMove.get() == false);
			this.firstMove.revert();
			
			[this.movingTeam, this.movingTeam.opposition].forEach((team)=>{
				team.activePieces.forEach((piece)=>{
					if(piece instanceof DirectionPiece)
					{
						const reachableBits = piece.reachableBits.get();
						if
						(
							reachableBits.interact(BitVector.READ, move.before) ||
							reachableBits.interact(BitVector.READ, move.after)
						)
						{
							piece.revertReachableSquaresAndBitsAndKingSeer();
						}
					}
					else if(piece==movingPiece)
					{
						piece.revertReachableSquaresAndBitsAndKingSeer();
					}
					else
					{
						piece.revertKingSeer();
					}
				});
			});
						
			//NOW revoke the capture of the target piece
			targetPiece?.activate();
		}
		
		this.regressMoveCounters();
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
		if("checkmate_in_halfmoves" in evaluation)
		{
			const teamToGiveMate = ((evaluation.checkmate_in_halfmoves % 2) == 0) ?
			this.movingTeam : this.movingTeam.opposition;
			const sign = teamToGiveMate instanceof WhiteTeam? "+" : "+";
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
		let castleRightsString = this.castleRights.get().join("");
		if(castleRightsString==""){castleRightsString="-";}
		return [boardString, this.movingTeam.constructor.char, castleRightsString, this.enPassantable.get(), this.halfMove, this.fullMove].join(" ");
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