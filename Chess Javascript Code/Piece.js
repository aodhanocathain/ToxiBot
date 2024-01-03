const {MIN_FILE} = require("./Constants.js");
const {asciiDistance} = require("./Helpers.js");
const {BitVector} = require("./BitVector.js");
const {Manager} = require("./Manager.js");
const {Square} = require("./Square.js");
const {PlainMove, CastleMove, EnPassantMove, PromotionMove} = require("./Move.js");

class Piece
{
	static typeChar;
	static points;
	static name;
	
	static typeCharOfTeamedChar(teamedChar)
	{
		return teamedChar.toUpperCase();
	}
	
	static squaresAttackedFromSquareInGame(square, game)
	{
		throw "squaresAttackedFromSquareInGame called but not implemented";
	}
	
	static makeMoveString(move)
	{
		const game = move.game;
		//See what squares this type of piece could have come from to reach the new square
		const movingPiece = game.pieces[move.mainPieceSquareBefore]		
		let otherOrigins =
		this.squaresAttackedFromSquareInGame(move.mainPieceSquareAfter,game).squares.filter((otherOrigin)=>{
			const otherPiece = game.pieces[otherOrigin];
			//ignore the square the moving piece came from
			if(movingPiece==otherPiece){return false;}
			//piece teams must match
			if(movingPiece.team!=otherPiece?.team){return false;}
			//piece types must match
			if(movingPiece.constructor!=otherPiece?.constructor){return false;}
			
			return true;
		})
		
		const sameOriginFiles = otherOrigins.filter((square)=>{return Square.file(move.mainPieceSquareBefore)==Square.file(square);});
		const sameOriginRanks = otherOrigins.filter((square)=>{return Square.rank(move.mainPieceSquareBefore)==Square.rank(square);});
		
		const beforeDetails = 
		(otherOrigins.length==0)?	//piece is the only possible candidate for the move, needs no clarification
		"":
		(sameOriginFiles.length==0)?	//need to uniquely identify piece by its file
		Square.fileString(move.mainPieceSquareBefore) :
		(sameOriginRanks.length==0)?	//need to uniquely identify piece by its rank
		Square.rankString(move.mainPieceSquareBefore) :
		//must fully specify the square the piece starts on
		Square.fullString(move.mainPieceSquareBefore);
		
		const capture = game.pieces[move.mainPieceSquareAfter]? "x" : "";
		
		game.makeMove(move);
		const checkStatus =
		game.isCheckmate()? "#":
		game.kingChecked()? "+":
		"";
		game.undoMove();
		
		return `${movingPiece.constructor.typeChar}${beforeDetails}${capture}${Square.fullString(move.mainPieceSquareAfter)}${checkStatus}`;
	}
	
	game;
	team;
	square;
	
	squaresAttacked;
	squaresAttackedBitVector;	//BitVector where a bit is set if its index is a square in squaresAttacked
	squaresWatchedBitVector;	//BitVector where a bit is set if a change in its square requires updating the piece's options
	
	basicMoves;
	
	seesEnemyKing;
	
	qualities;
	
	//set by the piece's team
	id;
	
	constructor(game, team, square)
	{
		this.game = game;
		this.team = team;
		this.square = square;
		
		this.squaresAttacked = new Manager([]);
		this.squaresAttackedBitVector = new Manager(new BitVector());
		this.squaresWatchedBitVector = this.squaresAttackedBitVector;
		
		this.basicMoves = new Manager([]);
		
		this.seesEnemyKing = new Manager(false);
		
		this.qualities = {
			ownKingProximity: 
			{
				manager: new Manager(Infinity),
				measure: (piece) => {
					return Infinity;
				}
			},
			enemyKingProximity: {
				manager: new Manager(Infinity),
				measure: (piece) => {
					return Infinity;
				}
			},
			numAvailableMoves:
			{
				manager: new Manager(0),
				measure: (piece) => {
					return 0;
				}
			}
		};
	}
	
	isActive()
	{
		return !!(this.team.activePieces[this.id]);
	}
	
	activate()
	{
		this.team.activatePiece(this);
	}
	
	deactivate()
	{
		this.team.deactivatePiece(this);
	}
	
	updateSquaresAndMoves()
	{
		const squaresAttacked = this.constructor.squaresAttackedFromSquareInGame(this.square, this.game);
		
		this.squaresAttacked.update(squaresAttacked.squares);
		this.squaresAttackedBitVector.update(squaresAttacked.bits);
		
		this.basicMoves.update(this.squaresAttacked.get().reduce((accumulator, attackedSquare)=>{
			//only allow moves that do not capture pieces from the same team
			if(this.game.pieces[attackedSquare]?.team != this.team)
			{
				accumulator.push(new PlainMove(this.game, this.square, attackedSquare));
			}
			return accumulator;
		}, []));
	}
	
	revertSquaresAndMoves()
	{
		this.squaresAttacked.revert();
		this.squaresAttackedBitVector.revert();
		
		this.basicMoves.revert();
	}
	
	updateSightOfEnemyKing()
	{
		const oldKingSight = this.seesEnemyKing.get();
		const newKingSight = this.squaresAttackedBitVector.get().read(this.team.opposition.king.square)
		this.seesEnemyKing.update(newKingSight);
		this.team.numEnemyKingSeers += newKingSight - oldKingSight;
	}
	
	revertSightOfEnemyKing()
	{
		const oldKingSight = this.seesEnemyKing.pop();
		const newKingSight = this.seesEnemyKing.get();
		this.team.numEnemyKingSeers += newKingSight - oldKingSight;
	}
	
	updateQualities()
	{
		Object.values(this.qualities).forEach((quality)=>{
			quality.manager.update(quality.measure(this));
		});
	}
	
	revertQualities()
	{
		Object.values(this.qualities).forEach((quality)=>{
			quality.manager.revert();
		});
	}
	
	updateAllProperties()
	{
		this.updateSquaresAndMoves();
		this.updateSightOfEnemyKing();
		this.updateQualities();
	}
	
	revertAllProperties()
	{
		this.revertSquaresAndMoves();
		this.revertSightOfEnemyKing();
		this.revertQualities();
	}
	
	addAttackingMovesToArray(array)
	{
		array.push([this.basicMoves.get()]);
	}
	
	addMovesToArray(array)
	{
		this.addAttackingMovesToArray(array);
	}
	
	toString()
	{
		return `${this.team.constructor.charConverter(this.constructor.typeChar)}`;
	}
}

//pieces that update their options when something happens in the range of squares they can see
class BlockablePiece extends Piece
{
}

//pieces whose moves extend out as far as possible in a set of directions
class RangedPiece extends BlockablePiece
{
	static directions;
	
	static squaresAttackedFromSquareInGame(square, game)
	{
		const squaresArray = [];
		const squaresBits = new BitVector();
		
		const rank = Square.rank(square);
		const file = Square.file(square);
		
		for(const [rankOffset,fileOffset] of this.directions)
		{
			let newRank = rank+rankOffset;
			let newFile = file+fileOffset;
			let blocked = false;
			
			//keep stepping further in the given direction until reaching the edge of the board or another piece
			while(Square.validRankAndFile(newRank,newFile) && !blocked)
			{
				const newSquare = Square.withRankAndFile(newRank,newFile);
				
				//checking if the way is blocked AFTER adding the potentially blocked square is important
				//e.g. capturing a piece necessarily involves being able to move to the square that is blocked
				squaresArray.push(newSquare);
				squaresBits.set(newSquare);
				
				blocked = game.pieces[newSquare]
				newRank += rankOffset;
				newFile += fileOffset;
			}
		}
		return {
			squares: squaresArray,
			bits: squaresBits
		};
	}
	
	constructor(game, team, square)
	{
		super(game, team, square);
	}
}

//pieces whose moves are always a fixed pattern around their current square
class PatternPiece extends Piece
{
	static pattern;
	
	static squaresAttackedFromSquareInGame(square, game)
	{
		const squaresArray = [];
		const squaresBits = new BitVector();
	
		const rank = Square.rank(square);
		const file = Square.file(square);
	
		for(const [rankOffset,fileOffset] of this.pattern)
		{
			const newRank = rank + rankOffset;
			const newFile = file + fileOffset;
		
			//if it is in the board, include it
			if(Square.validRankAndFile(newRank,newFile))
			{
				const newSquare = Square.withRankAndFile(newRank,newFile);
				squaresArray.push(newSquare);
				squaresBits.set(newSquare);
			}
		}
	
		return {
			squares: squaresArray,
			bits: squaresBits
		};
	}
	
	constructor(game, team, square)
	{
		super(game, team, square);
	}
}

class King extends PatternPiece
{
	static typeChar = "K";
	static name = "king";
	static points = 0;
	
	static pattern = [
		[-1,-1],
		[0,-1],
		[1,-1],
		[-1,0],
		[1,0],
		[-1,1],
		[0,1],
		[1,1]
	];
	
	castleMoves;
	
	//assigned by the game upon piece creation
	canCastle;
	
	constructor(game, team, square)
	{
		super(game, team, square);
		this.castleMoves = new Manager([]);
	}
	
	addMovesToArray(array)
	{
		array.push([this.basicMoves.get(),this.castleMoves.get()]);
	}
	
	updateSquaresAndMoves()
	{
		super.updateSquaresAndMoves();
		
		const castleMoves = [];
		//add castle moves if allowed
		//king must not have moved
		if(this.canCastle.get())
		{
			//can't castle to get out of check
			if(this.team.opposition.numEnemyKingSeers==0)
			{
				[King.typeChar, Queen.typeChar].forEach((wingChar)=>{
					const rook = this.team.rooksInStartSquaresByWingChar[wingChar];
					//rook must not have moved
					if(rook?.canCastle.get() && rook?.isActive())
					{
						//must have the right to castle
						if(this.game.castleRights.get().includes(this.team.constructor.charConverter(wingChar)))
						{
							//must not be any pieces between king and rook
							let noPiecesBetween = true;
							const kingFile = Square.file(this.team.constructor.STARTING_KING_SQUARE);
							const rookFile = Square.file(this.team.constructor.STARTING_ROOK_SQUARES_BY_WINGCHAR[wingChar]);
							const startFile = Math.min(kingFile, rookFile);
							const endFile = Math.max(kingFile, rookFile);
							for(let i=startFile+1; i<endFile; i++)
							{
								const square = Square.withRankAndFile(this.team.constructor.BACK_RANK, i);
								noPiecesBetween = noPiecesBetween && !(this.game.pieces[square]);
							}
							
							if(noPiecesBetween)
							{
								const precastleFile = Square.file(this.team.constructor.STARTING_KING_SQUARE);
								const postcastleFile = Square.file(this.team.constructor.CASTLE_KING_SQUARES_BY_WINGCHAR[wingChar]);
								const middleFile = (precastleFile + postcastleFile)/2;	//assumes start square and castle square are 2 apart
								//can't castle through check
								const passingSquare = Square.withRankAndFile(this.team.constructor.BACK_RANK, middleFile);
								if(!(this.team.opposition.activePieces.some((piece)=>{
									return piece.squaresAttackedBitVector.get().read(passingSquare);
								})))
								{
									castleMoves.push(new CastleMove(
									this.game,
									this.square, this.team.constructor.CASTLE_KING_SQUARES_BY_WINGCHAR[wingChar],
									rook.square, this.team.constructor.CASTLE_ROOK_SQUARES_BY_WINGCHAR[wingChar]
									));
								}
							}
						}
					}
				});
			}
		}
		this.castleMoves.update(castleMoves);
	}
	
	revertSquaresAndMoves()
	{
		super.revertSquaresAndMoves();
		this.castleMoves.revert();
	}
}

class Knight extends PatternPiece
{
	static typeChar = "N";
	static name = "knight";
	static points = 3;
	
	static pattern = [
		[-2,-1],
		[-2,1],
		[-1,-2],
		[-1,2],
		[1,-2],
		[1,2],
		[2,-1],
		[2,1]
	];
}

class Bishop extends RangedPiece
{
	static typeChar = "B";
	static name = "bishop";
	static points = 3;
	
	static directions = [
		[-1,-1],
		[1,-1],
		[-1,1],
		[1,1]
	];
}

class Rook extends RangedPiece
{
	static typeChar = "R";
	static name = "rook";
	static points = 5;
	
	static directions = [
		[0,-1],
		[-1,0],
		[1,0],
		[0,1]
	];
	
	//assigned by the game upon piece creation
	canCastle;
}

class Queen extends RangedPiece
{
	static typeChar = "Q";
	static name = "queen";
	static points = 9;
	
	static directions = [
		[-1,-1],
		[0,-1],
		[1,-1],
		[-1,0],
		[1,0],
		[-1,1],
		[0,1],
		[1,1]
	];
}

class Pawn extends BlockablePiece
{
	static typeChar = "P";
	static name = "pawn";
	static points = 1;
	
	static LONG_MOVE_RANK_INCREMENT_MULTIPLIER = 2;
	
	static squaresAttackedFromSquareInGameForTeam(square, game, team)
	{
		const squares = [];
		const bits = new BitVector();
		
		const rank = Square.rank(square);
		const file = Square.file(square);
		const lessFile = file-1;
		const moreFile = file+1;
		const nextRank = rank+team.constructor.PAWN_RANK_INCREMENT;
		
		if(Square.validRankAndFile(nextRank,lessFile))
		{
			const captureSquare = Square.withRankAndFile(nextRank, lessFile);
			squares.push(captureSquare);
			bits.set(captureSquare);
		}
		if(Square.validRankAndFile(nextRank,moreFile))
		{
			const captureSquare = Square.withRankAndFile(nextRank, moreFile);
			squares.push(captureSquare);
			bits.set(captureSquare);
		}
		return {
			squares: squares,
			bits: bits
		};
	}
	
	static squaresWatchedFromSquareInGameForTeam(square, game, team)
	{
		const squares = [];
		const bits = new BitVector();
		
		const rank = Square.rank(square);
		const file = Square.file(square);
		
		const nextRank = rank+team.constructor.PAWN_RANK_INCREMENT;
		
		if(Square.validRankAndFile(nextRank, file))
		{
			const nextSquare = Square.withRankAndFile(nextRank, file);
			squares.push(nextSquare);
			bits.set(nextSquare);
			if(!(game.pieces[nextSquare]))
			{
				if(rank==team.constructor.PAWN_START_RANK)
				{
					const nextNextRank = rank+(this.LONG_MOVE_RANK_INCREMENT_MULTIPLIER*team.constructor.PAWN_RANK_INCREMENT);
					const nextNextSquare = Square.withRankAndFile(nextNextRank, file);
					squares.push(nextNextSquare);
					bits.set(nextNextSquare);
				}
			}
		}
		
		return {
			squares: squares,
			bits: bits,
		};
	}
	
	static makeMoveString(move)
	{
		const game = move.game;		
		
		//if there is a capture, include current file and capture character
		const beforeDetails = (game.pieces[move.mainPieceSquareAfter] || game.pieces[move.captureTargetSquare] || game.pieces[move.otherPieceSquareAfter])?
		`${Square.fileString(move.mainPieceSquareBefore)}x` : ``;
		
		game.makeMove(move);
		const checkStatus = 
		game.isCheckmate()? "#":
		game.kingChecked()? "+":
		"";
		game.undoMove();
		
		const afterDetails = `${Square.fullString(move.mainPieceSquareAfter || move.otherPieceSquareAfter)}`;
		
		const promotionString = (move instanceof PromotionMove)? `=${move.otherPiece.constructor.typeChar}`:"";
		
		return `${beforeDetails}${afterDetails}${promotionString}${checkStatus}`;
	}
	
	squaresWatched;
	
	specialMoves;
	
	constructor(game, team, square)
	{
		super(game, team, square);
		
		this.squaresWatched = new Manager([]);
		this.squaresWatchedBitVector = new Manager(new BitVector());
		
		this.specialMoves = new Manager([]);
	}
	
	addMovesToArray(array)
	{
		array.push([this.basicMoves.get(), this.specialMoves.get()]);
	}
	
	updateSquaresAndMoves()
	{
		const squaresAttacked = this.constructor.squaresAttackedFromSquareInGameForTeam(this.square, this.game, this.team);
		this.squaresAttacked.update(squaresAttacked.squares);
		this.squaresAttackedBitVector.update(squaresAttacked.bits)
		
		const squaresWatched = this.constructor.squaresWatchedFromSquareInGameForTeam(this.square, this.game, this.team);
		this.squaresWatched.update(squaresWatched.squares);
		this.squaresWatchedBitVector.update(squaresWatched.bits);
		
		const basicMoves = [];
		const specialMoves = [];
		
		this.squaresAttacked.get().forEach((squareAttacked)=>{
			//only allow moves that capture a piece, from the enemy team
			if(this.game.pieces[squareAttacked])	//direct capture (enemy piece is on the attacked square)
			{
				if(this.game.pieces[squareAttacked].team != this.team)
				{
					if(Square.rank(squareAttacked)==this.team.opposition.constructor.BACK_RANK)
					{
						specialMoves.push(new PromotionMove(this.game, this.square, squareAttacked, new Queen(this.game, this.team, squareAttacked)));
						specialMoves.push(new PromotionMove(this.game, this.square, squareAttacked, new Rook(this.game, this.team, squareAttacked)));
						specialMoves.push(new PromotionMove(this.game, this.square, squareAttacked, new Bishop(this.game, this.team, squareAttacked)));
						specialMoves.push(new PromotionMove(this.game, this.square, squareAttacked, new Knight(this.game, this.team, squareAttacked)));
					}
					else
					{
						basicMoves.push(new PlainMove(this.game, this.square, squareAttacked));
					}
				}
			}
			else	//could still be en passant capture (enemy piece is not on target square)
			{
				const enPassantFile = asciiDistance(this.game.enPassantable.get(), MIN_FILE);
				//if enPassantFile is adjacent to current file
				if(enPassantFile==Square.file(squareAttacked))
				{
					//if current rank is opponent long move rank
					const opponentLongMoveRank = 
					this.team.opposition.constructor.PAWN_START_RANK +
					(Pawn.LONG_MOVE_RANK_INCREMENT_MULTIPLIER*this.team.opposition.constructor.PAWN_RANK_INCREMENT);
					if(Square.rank(this.square)==opponentLongMoveRank)
					{
						const enPassantSquare = Square.withRankAndFile(opponentLongMoveRank,enPassantFile);
						specialMoves.push(new EnPassantMove(this.game, this.square, squareAttacked, enPassantSquare));
					}
				}
			}
		});
		
		this.squaresWatched.get().forEach((watchedSquare)=>{
			//only allow moves to empty squares
			if(!(this.game.pieces[watchedSquare]))
			{
				if(Square.rank(watchedSquare)==this.team.opposition.constructor.BACK_RANK)
				{
					specialMoves.push(new PromotionMove(this.game, this.square, watchedSquare, new Queen(this.game, this.team, watchedSquare)));
					specialMoves.push(new PromotionMove(this.game, this.square, watchedSquare, new Rook(this.game, this.team, watchedSquare)));
					specialMoves.push(new PromotionMove(this.game, this.square, watchedSquare, new Bishop(this.game, this.team, watchedSquare)));
					specialMoves.push(new PromotionMove(this.game, this.square, watchedSquare, new Knight(this.game, this.team, watchedSquare)));
				}
				else
				{
					basicMoves.push(new PlainMove(this.game, this.square, watchedSquare));
				}
			}
		});
		
		this.basicMoves.update(basicMoves);
		this.specialMoves.update(specialMoves);
	}
	
	revertSquaresAndMoves()
	{
		super.revertSquaresAndMoves();
		
		this.squaresWatched.revert();
		this.specialMoves.revert();
	}
}

const PieceClasses = [
	King,
	Queen,
	Rook,
	Bishop,
	Knight,
	Pawn
];

//match piece type characters to classes
const PieceClassesByTypeChar = PieceClasses.reduce((accumulator, pieceClass)=>{
	accumulator[pieceClass.typeChar] = pieceClass;
	return accumulator;
}, {});

module.exports = {
	Piece:Piece,
	BlockablePiece:BlockablePiece,
	RangedPiece:RangedPiece,
	PatternPiece:PatternPiece,
	
	King:King,
	Queen:Queen,
	Rook:Rook,
	Bishop:Bishop,
	Knight:Knight,
	Pawn:Pawn,
	
	PieceClassesByTypeChar: PieceClassesByTypeChar,
}