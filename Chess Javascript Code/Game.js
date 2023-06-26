const {Piece, PieceClassesObject, PieceClassesArray} = require("./Piece.js");
const [King] = PieceClassesArray;
const {Transition, PlainMove} = require("./Move.js");
const {WHITE_TEAM, BLACK_TEAM, Team} = require("./Team.js");
const {Square} = require("./Square.js");
const {NUM_FILES, NUM_RANKS} = require("./Constants.js");

const Canvas = require("canvas");

const DEFAULT_FEN_STRING = "rnbqkbnr/8/8/8/8/8/8/RNBQKBNR w KQkq - 0 1";

//const DEFAULT_FEN_STRING = "k7/8/K7/Q7/8/8/8/8 w Qq - 0 1";

//const DEFAULT_FEN_STRING = "4k3/8/8/8/8/5n2/3N4/4K1N1 w Qq - 0 1";

class Game
{
	//FEN string components
	board;
	turn;
	castleRights;
	enPassantable;
	halfMove;
	fullMove;
	
	//other stuff
	notTurn;	
	playedMoves;
	
	legals;
	moves;
	legalsAge;
	movesAge;
	
	kingSquares;
	
	constructor(FENString = DEFAULT_FEN_STRING)
	{		
		const FENparts = FENString.split(" ");
		
		const boardString = FENparts[0];
		//ranks are delimitted by "/" in FEN strings
		const rankStrings = boardString.split("/");
		//FEN strings give ranks in descending order, must reverse to construct board in ascending rank order
		const board = rankStrings.reverse().map((rankString)=>{
			const characters = rankString.split("");
			return characters.map((character)=>{
				try
				//assume character denotes a number of empty squares
				{
					return Array(parseInt(character)).fill(null);
				}
				catch(error)
				//character actually denotes a piece
				{
					return Piece.fromTeamedChar(character);
				}
			}).flat(1);
		})
		
		this.board = board;
		this.turn = (FENparts[1] == WHITE_TEAM.toString())? WHITE_TEAM : BLACK_TEAM;
		this.castleRights = FENparts[2].split("");
		this.enPassantable = FENparts[3];
		this.halfMove = parseInt(FENparts[4]);
		this.fullMove = parseInt(FENparts[5]);
		
		//extra things that don't show up in the FEN string
		this.notTurn = (this.turn == WHITE_TEAM? BLACK_TEAM : WHITE_TEAM);
		this.playedMoves = [];
		
		//initialize king locations and piece destinations
		this.kingSquares = {};
		this.board.forEach((rankPieces, rank)=>{
			rankPieces.forEach((piece, file)=>{
				if(piece instanceof King)
				{
					this.kingSquares[piece.team.toString()] = new Square(rank, file);
				}
			});
		});
		
		this.updateMoves();	//movesAge = 0 now
		this.updateLegals();	//legalsAge = 0 now
	}
	
	clone()
	{
		return new Game(this.toString());
	}
	
	toString()
	{
		//game stores ranks in ascending order, must reverse a copy for descending order in FEN string
		const boardCopy = this.board.slice();
		const boardString = boardCopy.reverse().map((rankPieces)=>{
			let emptySquares = 0;
			let rankString = rankPieces.reduce((accumulator, piece)=>{
				if(piece)
				{
					if(emptySquares>0)
					{
						//denote how many empty squares separate pieces
						accumulator = accumulator.concat(`${emptySquares}`);
						emptySquares = 0;
					}
					accumulator = accumulator.concat(`${piece.toString()}`);
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
		return [boardString, this.turn.toString(), this.castleRights.join(""), this.enPassantable, this.halfMove, this.fullMove].join(" ");
	}

	evaluate(depth = 1)
	{
		if(depth>1)
		{
			const continuations = this.getLegals();
			
			//need to score checkmates and stalemates in future
			//maybe track temporal proximity of mates with a {"mate in halfmoves": 0}
			//that increments each turn back in time
			
			//start with the first continuation as the best
			let bestContinuation = continuations[0];
			this.makeMove(bestContinuation);
			let bestEvaluationScore = this.evaluate(depth-1).score;
			this.undoMove();
			
			const scoreBetterThanScore = (this.turn==WHITE_TEAM)?
			function(newEval, oldEval){return newEval > oldEval;} :
			function(newEval, oldEval){return newEval < oldEval;}
			
			//check for better continuations
			for(let i=1; i<continuations.length; i++)
			{
				const newContinuation = continuations[i];
				this.makeMove(newContinuation);
				const newEvaluationScore = this.evaluate(depth-1).score;
				this.undoMove();
				
				if(scoreBetterThanScore(newEvaluationScore,bestEvaluationScore))
				{
					bestContinuation = newContinuation;
					bestEvaluationScore = newEvaluationScore;
				}
			}
			return {
				score: bestEvaluationScore,
				bestMove: bestContinuation
			};
		}
		else
		{
			
			const continuations = this.getLegals();
			
			//need to score checkmates and stalemates in future
			//maybe track temporal proximity of mates with a {"mate in halfmoves": 0}
			//that increments each turn back in time
			
			//start with the first continuation as the best
			let bestContinuation = continuations[0];
			this.makeMove(bestContinuation);
			let bestEvaluationScore = this.immediatePositionScore();
			this.undoMove();
			
			const scoreBetterThanScore = (this.turn==WHITE_TEAM)?
			function(newEval, oldEval){return newEval > oldEval;} :
			function(newEval, oldEval){return newEval < oldEval;}
			
			//check for better continuations
			for(let i=1; i<continuations.length; i++)
			{
				const newContinuation = continuations[i];
				this.makeMove(newContinuation);
				const newEvaluationScore = this.immediatePositionScore();
				this.undoMove();
				
				if(scoreBetterThanScore(newEvaluationScore,bestEvaluationScore))
				{
					bestContinuation = newContinuation;
					bestEvaluationScore = newEvaluationScore;
				}
			}
			return {
				score: bestEvaluationScore,
				bestMove: bestContinuation
			};
		}
	}
	
	immediatePositionScore()
	{
		let score=0;
		this.board.forEach((rankPieces)=>{
			rankPieces.forEach((piece)=>{
				if(piece)
				{
					if(piece.team==WHITE_TEAM)
					{
						score += piece.constructor.points;
					}
					else
					{
						score -= piece.constructor.points;
					}
				}
			})
		})
		return score;
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
		
		this.board.forEach((rankPieces, rank)=>{
			rankPieces.forEach((piece, file)=>{
				//colour this square
				context.fillStyle = (((rank+file)%2) == 0) ?  DARK_COLOUR : LIGHT_COLOUR;
				const x = file*SQUARE_PIXELS;
				const y = ((NUM_RANKS-1)-rank)*SQUARE_PIXELS;
				context.fillRect(x, y, SQUARE_PIXELS, SQUARE_PIXELS);
			
				//annotate the square name e.g. "f3"
				context.fillStyle = FONT_COLOUR;
				context.fillText(new Square(rank,file).toString(), x, y+SQUARE_PIXELS);

				//draw a piece if one is present
				if(piece)
				{
					drawCalls.push(new Promise((resolve, reject)=>{
						piece.image.then((i)=>{
							context.drawImage(i, x, y, SQUARE_PIXELS, SQUARE_PIXELS);
							resolve("done");
						});
					}))
				}
			});
		});
		
		//make sure all pieces have been drawn
		return Promise.all(drawCalls).then(()=>{
			return canvas.toBuffer("image/png");
		});
	}
	
	isCheckmate()
	{
		return (this.getLegals().length == 0) && this.kingChecked();
	}

	isStalemate()
	{
		return (this.getLegals().length == 0) && !(this.kingChecked());
	}
	
	makeMove(move)
	{
		if(move instanceof PlainMove)
		{
			//place in new square
			this.board[move.mainTransition.after.rank][move.mainTransition.after.file] = move.movingPiece;
			//remove from old square
			this.board[move.mainTransition.before.rank][move.mainTransition.before.file] = null;
			if(move.movingPiece instanceof King)
			{
				//update kingSquare
				this.kingSquares[move.movingPiece.team.toString()] = move.mainTransition.after;
				
				//forfeit castle rights
				this.castleRights = this.castleRights.filter((wing)=>{
					//retain the castle rights of the opposition, i.e. moving team loses castle rights
					return Team.ofTeamedChar(wing) != this.turn;
				})
			}			
			move.movingPiece.moved = true;
			
			this.enPassantable = "-";
		}
		
		if(this.halfMove==1)
		{
			//this corresponds to when black has just moved, meaning a full move has passed
			this.fullMove++;
		}
		this.halfMove = (this.halfMove+1)%2;
		
		this.playedMoves.push(move);
		
		this.changeTurns();
		
		this.movesAge++;	//the last time the moves were constructed was 1 more turn ago
		this.legalsAge++;	//the last time the legals were constructed was 1 more turn ago
	}
	
	undoMove()
	{
		const move = this.playedMoves.pop();
		if(move instanceof PlainMove)
		{
			//place in old square
			this.board[move.mainTransition.before.rank][move.mainTransition.before.file] = move.movingPiece;
			//restore target square
			this.board[move.mainTransition.after.rank][move.mainTransition.after.file] = move.targetPiece;
			if(move.movingPiece instanceof King)
			{
				//update kingSquare
				this.kingSquares[move.movingPiece.team.toString()] = move.mainTransition.before;
				
				//restore preexisting castle rights
				this.castleRights = move.castleRights;
			}
			move.movingPiece.moved = (move.firstMove == false);
			
			this.enPassantable = move.enPassantable;
		}
		if(this.halfMove==0)
		{
			this.fullMove--;
		}
		this.halfMove = (this.halfMove+1)%2;
		
		this.changeTurns();
		
		this.movesAge--;	//the last time the moves were constructed was 1 less turn ago
		this.legalsAge--;	//the last time the legals were constructed was 1 less turn ago
	}
	
	conditionAfterTempMove(move, conditionFunction)
	{
		//make a move, check some condition, then undo the move
		//this pattern arises a lot
		this.makeMove(move);
		const condition = conditionFunction(this, move);
		this.undoMove();
		return condition;
	}
	
	getLegals(makeStrings)
	{
		if(this.legalsAge!=0)
		{
			this.updateLegals(makeStrings);
		}
		return this.legals;
	}
	
	getMoves(makeStrings)
	{
		if(this.movesAge!=0)
		{
			this.updateMoves(makeStrings);
		}
		return this.moves;
	}
	
	updateLegals(makeStrings)
	{
		this.legals = this.getMoves(makeStrings).filter((move)=>{
			return this.conditionAfterTempMove(move, function(game,move){
				return !(game.kingCapturable());
			})
		});
	}
	
	updateMoves(makeStrings)
	{
		const moves = [];
		//find all the pieces of the moving team and accumulate their moves
		this.board.forEach((pieces, rank)=>{
			pieces.forEach((piece, file)=>{
				if(piece)
				{
					//if piece is on moving team
					if(piece.team==this.turn)
					{
						//get destination squares of current piece
						const currentSquare = new Square(rank, file);
						const destinations = piece.constructor.getDestinations(currentSquare, this);
						const transitions = destinations.map((destinationSquare)=>{
							return new Transition(currentSquare, destinationSquare);
						})
						//turn each transition into a move and add to list
						transitions.forEach((transition)=>{
							const targetPiece = this.board[transition.after.rank][transition.after.file];
							//only allow moves that do not capture pieces from the same team
							if(targetPiece?.team!=piece.team)
							{
								moves.push(new PlainMove(transition, this, makeStrings));
							}
						});
					}
				}
			});
		});
		this.moves = moves;
	}
	
	kingCapturable()
	{
		const enemyKingSquare = this.kingSquares[this.notTurn.toString()];
		
		return this.getMoves().some((move)=>{
			if(move instanceof PlainMove)
			{
				return move.mainTransition.after.sameAs(enemyKingSquare);
			}
		});
	}
	
	kingChecked()
	{
		//define check as when the moving team's king could be "captured" were it the other team's turn again
		this.changeTurns();
		const allowed = this.kingCapturable();
		this.changeTurns();
		return allowed;
	}
	
	changeTurns()
	{
		const notTurnCopy = this.notTurn;
		this.notTurn = this.turn;
		this.turn = notTurnCopy;
	}
}

module.exports = {
	Game:Game
}