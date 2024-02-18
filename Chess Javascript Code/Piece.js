const {MIN_FILE, NUM_RANKS, NUM_FILES, CAPTURE_CHAR, CHECK_CHAR, CHECKMATE_CHAR} = require("./Constants.js");
const {asciiDistance, extractBits} = require("./Helpers.js");
const {BitVector64} = require("./BitVector64.js");
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
	
	static makeMoveString(move, game)
	{
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
		(sameOriginFiles.length==0)?	//can uniquely identify piece by its file
		Square.fileString(move.mainPieceSquareBefore) :
		(sameOriginRanks.length==0)?	//can uniquely identify piece by its rank
		Square.rankString(move.mainPieceSquareBefore) :
		//must fully specify the square the piece starts on
		Square.fullString(move.mainPieceSquareBefore);
		
		const captureSquare = (move instanceof EnPassantMove)? move.enPassantSquare : move.mainPieceSquareAfter;
		const capture = game.pieces[captureSquare]? CAPTURE_CHAR : "";
		
		game.makeMove(move);
		const checkStatus =
		game.isCheckmate()? CHECKMATE_CHAR:
		game.kingChecked()? CHECK_CHAR:
		"";
		game.undoMove();
		
		return `${movingPiece.constructor.typeChar}${beforeDetails}${capture}${Square.fullString(move.mainPieceSquareAfter)}${checkStatus}`;
	}
	
	game;
	team;
	square;
	
	squaresAttacked;
	squaresAttackedBitVector;	//BitVector64 where a bit is set if its index is a square in squaresAttacked
	squaresWatchedBitVector;	//BitVector64 where a bit is set if a change in its square requires updating the piece's options
	
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
		this.squaresAttackedBitVector = new Manager(new BitVector64());
		this.squaresWatchedBitVector = this.squaresAttackedBitVector;
		
		this.basicMoves = new Manager([]);
		
		this.seesEnemyKing = new Manager(false);
		
		this.qualities = {
			/*
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
			*/
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
				accumulator.push(new PlainMove(this.square, attackedSquare));
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
		this.seesEnemyKing.update(this.squaresAttackedBitVector.get().read(this.team.opposition.king.square));
	}
	
	revertSightOfEnemyKing()
	{
		this.seesEnemyKing.revert();
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
		array.push(this.basicMoves.get());
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
	
	static squaresAttackedFromSquareUnblocked(square)
	{
		const squaresArrays = [];
		const squaresBits = new BitVector64();
		
		const rank = Square.rank(square);
		const file = Square.file(square);
		
		for(const [rankOffset,fileOffset] of this.directions)
		{
			const array = [];
			let newRank = rank+rankOffset;
			let newFile = file+fileOffset;
			
			//keep stepping further in the given direction until reaching the edge of the board or another piece
			while(Square.validRankAndFile(newRank,newFile))
			{
				const newSquare = Square.withRankAndFile(newRank,newFile);
				
				//checking if the way is blocked AFTER adding the potentially blocked square to the list is important
				//e.g. capturing a piece necessarily involves being able to move to the square that is blocked
				array.push(newSquare);
				squaresBits.set(newSquare);
				newRank += rankOffset;
				newFile += fileOffset;
			}
			squaresArrays.push(array);
		}
		return {
			squares: squaresArrays,
			bits: squaresBits
		};
	}

	static squaresAttackedFromSquareInGame(square, game)
	{
		/*
		const squaresArray = [];
		const squaresBits = new BitVector64();
		
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
				
				//checking if the way is blocked AFTER adding the potentially blocked square to the list is important
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
		*/

		const squaresAttacked = this.squaresAttackedFromSquareUnblocked(square);

		const squaresArrays = [];
		const squaresBits = new BitVector64();

		for(const unblockedArray of squaresAttacked.squares)
		{
			const blockedArray = [];
			for(const square of unblockedArray)
			{				
				blockedArray.push(square);
				squaresBits.set(square);
				
				if(game.pieces[square]){break;}
			}

			squaresArrays.push(blockedArray);
		}

		return {
			squares: squaresArrays.flat(2),
			bits: squaresBits
		};
	}
	
	static squaresAttackedFromSquare_lookup;
	static movesFromSquare_lookup;

	constructor(game, team, square)
	{
		super(game, team, square);
	}
}

//pieces whose moves are always a fixed pattern around their current square
class PatternPiece extends Piece
{
	static patternIncreasing;
	
	static squaresAttackedFromSquareInGame(square, game)
	{
		const squaresArray = [];
		const squaresBits = new BitVector64();
	
		const rank = Square.rank(square);
		const file = Square.file(square);
	
		for(const [rankOffset,fileOffset] of this.patternIncreasing)
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

	static squaresAttackedFromSquare_lookup;
	static movesFromSquare_lookup;

	static initClassLookups()
	{
		this.squaresAttackedFromSquare_lookup =
		//generate array of consecutive integers, one representing each square
		Array(NUM_RANKS*NUM_FILES).fill(null).map((item,index)=>{return index;}).map((square)=>{
			//for each square, generate the set of squares this piece could attack
			return this.squaresAttackedFromSquareInGame(square)
		});

		this.movesFromSquare_lookup = //could have different move sets from same square depending on which squares have friendly pieces on them
		//for n destinations from a given square, have 2^n possible combinations of friendly pieces in the destination squares
		this.squaresAttackedFromSquare_lookup.map((squaresAttacked,fromSquare)=>{
			return Array(1<<this.patternIncreasing.length).fill(null).map((item,index)=>{
				const moves = [];
				const bits = index;
				for(let i=0; i<squaresAttacked.squares.length; i++)
				{
					if(((bits >> i) & 1) == 0)
					{
						moves.push(new PlainMove(fromSquare, squaresAttacked.squares[i]));
					}
				}
				return moves;
			})
		})
	}

	constructor(game, team, square)
	{
		super(game, team, square);
	}

	updateSquaresAndMoves()
	{
		const squaresAttacked = this.constructor.squaresAttackedFromSquare_lookup[this.square];
		
		this.squaresAttacked.update(squaresAttacked.squares);
		this.squaresAttackedBitVector.update(squaresAttacked.bits);
		
		const friendlies = extractBits(this.team.activePieceLocationsBitVector, squaresAttacked.squares);
		this.basicMoves.update(this.constructor.movesFromSquare_lookup[this.square][friendlies]);
	}
}

class King extends PatternPiece
{
	//King must update castle moves if own pieces move in/out of the way,
	//or if enemy pieces guarding intermediate squares are blocked etc.
	
	//for now the King is always fully updated after every move in the game
	static typeChar = "K";
	static name = "king";
	static points = 0;
	
	static patternIncreasing = [
		[-1,-1],
		[-1,0],
		[-1,1],
		[0,-1],
		[0,1],
		[1,-1],
		[1,0],
		[1,1]
	];
	
	castleMoves;
	
	//assigned by the game upon piece creation
	canCastle;
	
	constructor(game, team, square)
	{
		super(game, team, square);
		this.castleMoves = new Manager([]);
		this.canCastle = new Manager(false);
	}
	
	addMovesToArray(array)
	{
		array.push(this.basicMoves.get());
		array.push(this.castleMoves.get());
	}
	
	updateCastleMoves()
	{
		const castleMoves = [];
		//add castle moves if allowed
		//king must not have moved, can't castle to get out of check
		if(this.canCastle.get() && this.team.opposition.numEnemyKingSeers==0)
		{
			WINGS.forEach((wingChar)=>{
				const rook = this.team.rooksInStartSquaresByWing[wingChar];
				//rook must not have moved
				if(rook?.canCastle.get() && rook?.isActive())
				{
					//must not be any pieces between king and rook
					const blockingPieceLocationsBitVector = this.team.activePieceLocationsBitVector.clone();
					blockingPieceLocationsBitVector.or(this.team.opposition.activePieceLocationsBitVector);
					blockingPieceLocationsBitVector.and(this.team.constructor.CASTLE_INTERMEDIATE_SQUARES_BITVECTOR_BY_WING[wingChar]);
					const noPiecesBetween = blockingPieceLocationsBitVector.isEmpty();
					const squaresAreSafe = this.team.opposition.idsSeeingEnemyCastleSafeSquaresBitVectorByWing[wingChar].isEmpty();
					if(noPiecesBetween && squaresAreSafe)
					{
						castleMoves.push(new CastleMove(
						this.square, this.team.constructor.CASTLE_KING_SQUARES_BY_WING[wingChar],
						rook.square, this.team.constructor.CASTLE_ROOK_SQUARES_BY_WING[wingChar]
						));
					}
				}
			});
		}
		this.castleMoves.update(castleMoves);
	}

	updateSquaresAndMoves()
	{
		super.updateSquaresAndMoves();
		this.updateCastleMoves();
	}
	
	revertSquaresAndMoves()
	{
		super.revertSquaresAndMoves();
		this.castleMoves.revert();
	}
}
King.initClassLookups();

class Knight extends PatternPiece
{
	static typeChar = "N";
	static name = "knight";
	static points = 3;
	
	static patternIncreasing = [
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
Knight.initClassLookups();

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

	constructor(game, team, square)
	{
		super(game, team, square);
		this.canCastle = new Manager(false);
	}
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
		const bits = new BitVector64();
		
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
		const bits = new BitVector64();
		
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
	
	static makeMoveString(move, game)
	{
		//if there is a capture, include current file and capture character
		const beforeDetails = ((move instanceof EnPassantMove) || (game.pieces[move.mainPieceSquareAfter]))?
		`${Square.fileString(move.mainPieceSquareBefore)}${CAPTURE_CHAR}` : ``;
		
		game.makeMove(move);
		const checkStatus = 
		game.isCheckmate()? CHECKMATE_CHAR:
		game.kingChecked()? CHECK_CHAR:
		"";
		game.undoMove();
		
		const afterDetails = `${Square.fullString(move.mainPieceSquareAfter)}`;
		
		const promotionString = (move instanceof PromotionMove)? `=${move.promotionPiece.constructor.typeChar}`:"";
		
		return `${beforeDetails}${afterDetails}${promotionString}${checkStatus}`;
	}
	
	squaresWatched;
	
	specialMoves;
	
	constructor(game, team, square)
	{
		super(game, team, square);
		
		this.squaresWatched = new Manager([]);
		this.squaresWatchedBitVector = new Manager(new BitVector64());
		
		this.specialMoves = new Manager([]);
	}
	
	addMovesToArray(array)
	{
		array.push(this.basicMoves.get());
		array.push(this.specialMoves.get());
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
			if(this.team.opposition.activePieceLocationsBitVector.read(squareAttacked))
			{
				if(Square.rank(squareAttacked)==this.team.opposition.constructor.BACK_RANK)
				{
					specialMoves.push(new PromotionMove(this.square, squareAttacked, new Queen(this.game, this.team, squareAttacked)));
					specialMoves.push(new PromotionMove(this.square, squareAttacked, new Rook(this.game, this.team, squareAttacked)));
					specialMoves.push(new PromotionMove(this.square, squareAttacked, new Bishop(this.game, this.team, squareAttacked)));
					specialMoves.push(new PromotionMove(this.square, squareAttacked, new Knight(this.game, this.team, squareAttacked)));
				}
				else
				{
					basicMoves.push(new PlainMove(this.square, squareAttacked));
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
						specialMoves.push(new EnPassantMove(this.square, squareAttacked, enPassantSquare));
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
					specialMoves.push(new PromotionMove(this.square, watchedSquare, new Queen(this.game, this.team, watchedSquare)));
					specialMoves.push(new PromotionMove(this.square, watchedSquare, new Rook(this.game, this.team, watchedSquare)));
					specialMoves.push(new PromotionMove(this.square, watchedSquare, new Bishop(this.game, this.team, watchedSquare)));
					specialMoves.push(new PromotionMove(this.square, watchedSquare, new Knight(this.game, this.team, watchedSquare)));
				}
				else
				{
					basicMoves.push(new PlainMove(this.square, watchedSquare));
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
		this.squaresWatchedBitVector.revert();
		
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

const WINGS = [King.typeChar, Queen.typeChar];

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
	
	WINGS: WINGS
}