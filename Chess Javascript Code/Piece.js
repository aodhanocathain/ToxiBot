const {MIN_FILE, NUM_RANKS, NUM_FILES, CAPTURE_CHAR, CHECK_CHAR, CHECKMATE_CHAR} = require("./Constants.js");
const {asciiDistance, countTrailingZeroesInBits, countTrailingZeroesInBitsPlus1IfNonzero, intsUpTo} = require("./Helpers.js");
const {BitVector64} = require("./BitVector64.js");
const {Manager} = require("./Manager.js");
const {Square, SquareList} = require("./Square.js");
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
		//(assumes this type of piece can move back to previous squares in the same way that it moved away from them)
		const movingPiece = game.pieces[move.mainPieceSquareBefore]		
		const otherOrigins = [];
		for(const otherOrigin of this.squaresAttackedFromSquareInGame(move.mainPieceSquareAfter, game))
		{
			const otherPiece = game.pieces[otherOrigin];
			const legitimate = (movingPiece!=otherPiece) && (movingPiece.team==otherPiece?.team) && (movingPiece.constructor==otherPiece?.constructor);
			if(legitimate){otherOrigins.push(otherOrigin);}
		}
		
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
	squaresWatched;
	
	basicMoves;
	
	seesOpposingKing;
	
	qualities;
	
	castleRightsMask;

	//set by the piece's team
	id;
	
	constructor(game, team, square)
	{
		this.game = game;
		this.team = team;
		this.square = square;
		
		this.squaresAttacked = new Manager(new SquareList());
		this.squaresWatched = this.squaresAttacked;
		
		this.basicMoves = new Manager([]);
		
		this.seesOpposingKing = new Manager(false);
		
		this.qualities = {
			/*
			ownKingProximity: 
			{
				manager: new Manager(Infinity),
				measure: (piece) => {
					return Infinity;
				}
			},
			opposingKingProximity: {
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

		this.castleRightsMask = -1;	//overwritten by king and rook constructors
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
		this.squaresAttacked.update(squaresAttacked);
		
		const destinationsPossible = squaresAttacked.withoutFriendlies(this.team.activePieceLocationsBitVector);

		const basicMoves = Array.from(destinationsPossible).map((attackedSquare)=>{
			basicMoves.push(new PlainMove(this.square, attackedSquare));
		})
		this.basicMoves.update(basicMoves);
	}
	
	revertSquaresAndMoves()
	{
		this.squaresAttacked.revert();
		
		this.basicMoves.revert();
	}
	
	updateSightOfOpposingKing()
	{
		this.seesOpposingKing.update(this.squaresAttacked.get().has(this.team.opposition.king.square));
	}
	
	revertSightOfOpposingKing()
	{
		this.seesOpposingKing.revert();
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
		this.updateSightOfOpposingKing();
		this.updateQualities();
	}
	
	revertAllProperties()
	{
		this.revertSquaresAndMoves();
		this.revertSightOfOpposingKing();
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
	static directionsIncreasing;
	static directionsDecreasing;

	static squaresAttackedFromSquareInDirectionUnblocked(square, direction)
	{
		const squareList = new SquareList();
		
		const rank = Square.rank(square);
		const file = Square.file(square);
		
		const [rankOffset, fileOffset] = direction;
		let newRank = rank+rankOffset;
		let newFile = file+fileOffset;
		
		//keep stepping further in the given direction until reaching the edge of the board
		while(Square.validRankAndFile(newRank,newFile))
		{
			const newSquare = Square.withRankAndFile(newRank,newFile);
			squareList.add(newSquare);

			newRank += rankOffset;
			newFile += fileOffset;
		}

		return squareList;
	}
	
	static squaresAttackedFromSquareInDirectionIncreasingBlocked(square, direction, distance)
	{
		const unblocked = this.squaresAttackedFromSquareInDirectionUnblocked(square, direction);
		const blockedSquares = [];
		let i=0;
		for(const square of unblocked)
		{
			if(i==distance){break;}
			blockedSquares.push(square);
			i++;
		}
		const squareList = blockedSquares.reduce((accumulator, square)=>{
			accumulator.add(square)
			return accumulator;
		}, new SquareList());

		return squareList;
	}

	static squaresAttackedFromSquareInDirectionDecreasingBlocked(square, direction, distance)
	{
		const unblocked = this.squaresAttackedFromSquareInDirectionUnblocked(square, direction);
		const blockedSquares = unblocked.squares().reverse().slice(0, distance);
		const squareList = blockedSquares.reduce((accumulator, square)=>{
			accumulator.add(square)
			return accumulator;
		}, new SquareList());

		return squareList;
	}

	static squaresAttackedFromSquareInGame(square, game)
	{
		const friendlyBits = game.movingTeam.activePieceLocationsBitVector;
		const opposingBits = game.movingTeam.opposition.activePieceLocationsBitVector;
		const bothBits = new BitVector64();
		bothBits.or(friendlyBits);
		bothBits.or(opposingBits);

		const squareList = new SquareList();

		for(let d=0; d<this.directionsIncreasing.length; d++)
		{
			const direction = this.directionsIncreasing[d];
			const unblocked = this.squaresAttackedFromSquareInDirectionUnblocked(square, direction);
			const anyblockers = bothBits.extractBitsUsingSquareList(unblocked);
			const attackDistance = countTrailingZeroesInBitsPlus1IfNonzero(anyblockers, NUM_RANKS-1);
			const blocked = this.squaresAttackedFromSquareInDirectionIncreasingBlocked(square, direction, attackDistance);
			squareList.combine(blocked);
		}

		for(let d=0; d<this.directionsDecreasing.length; d++)
		{
			const direction = this.directionsDecreasing[d];
			const unblocked = this.squaresAttackedFromSquareInDirectionUnblocked(square, direction);
			const anyblockers = bothBits.extractBitsUsingSquareList(unblocked);
			const attackDistance = countTrailingZeroesInBitsPlus1IfNonzero(anyblockers, NUM_RANKS-1);
			const blocked = this.squaresAttackedFromSquareInDirectionDecreasingBlocked(square, direction, attackDistance);
			squareList.combine(blocked);
		}

		return squareList;
	}

	static squaresAttackedFromSquareInDirectionIncreasingUnblocked_lookup;
	static squaresAttackedFromSquareInDirectionDecreasingUnblocked_lookup;
	static squaresAttackedFromSquareInDirectionIncreasingBlocked_lookup;
	static squaresAttackedFromSquareInDirectionDecreasingBlocked_lookup;
	static movesFromSquareInDirectionIncreasing_lookup;
	static movesFromSquareInDirectionDecreasing_lookup;

	static initClassLookups()
	{
		this.squaresAttackedFromSquareInDirectionIncreasingUnblocked_lookup = Square.increasingFullArray().map((fromSquare)=>{
			return this.directionsIncreasing.map((direction)=>{
				return this.squaresAttackedFromSquareInDirectionUnblocked(fromSquare, direction);
			})
		});

		this.squaresAttackedFromSquareInDirectionDecreasingUnblocked_lookup = Square.increasingFullArray().map((fromSquare)=>{
			return this.directionsDecreasing.map((direction)=>{
				return this.squaresAttackedFromSquareInDirectionUnblocked(fromSquare, direction);
			})
		});

		this.squaresAttackedFromSquareInDirectionIncreasingBlocked_lookup = Square.increasingFullArray().map((fromSquare)=>{
			return this.directionsIncreasing.map((direction)=>{
				return intsUpTo(NUM_RANKS).map((distance)=>{
					return this.squaresAttackedFromSquareInDirectionIncreasingBlocked(fromSquare, direction, distance);
				})
			})
		});

		this.squaresAttackedFromSquareInDirectionDecreasingBlocked_lookup = Square.increasingFullArray().map((fromSquare)=>{
			return this.directionsDecreasing.map((direction)=>{
				return intsUpTo(NUM_RANKS).map((distance)=>{
					return this.squaresAttackedFromSquareInDirectionDecreasingBlocked(fromSquare, direction, distance);
				})
			})
		});

		this.movesFromSquareInDirectionIncreasing_lookup = Square.increasingFullArray().map((fromSquare)=>{
			return this.directionsIncreasing.map((direction)=>{
				return intsUpTo(NUM_RANKS).map((distance)=>{
					return this.squaresAttackedFromSquareInDirectionIncreasingBlocked(fromSquare, direction, distance).squares().map((toSquare)=>{
						return new PlainMove(fromSquare, toSquare);
					})
				})
			})
		})

		this.movesFromSquareInDirectionDecreasing_lookup = Square.increasingFullArray().map((fromSquare)=>{
			return this.directionsDecreasing.map((direction)=>{
				return intsUpTo(NUM_RANKS).map((distance)=>{
					return this.squaresAttackedFromSquareInDirectionDecreasingBlocked(fromSquare, direction, distance).squares().map((toSquare)=>{
						return new PlainMove(fromSquare, toSquare);
					})
				})
			})
		})
	}

	constructor(game, team, square)
	{
		super(game, team, square);
	}

	updateSquaresAndMoves()
	{
		const moves = [];
		const squares = new SquareList();

		const friendlyBits = this.team.activePieceLocationsBitVector;
		const opposingBits = this.team.opposition.activePieceLocationsBitVector;
		const bothBits = new BitVector64();
		bothBits.or(friendlyBits);
		bothBits.or(opposingBits);

		for(let d=0; d<this.constructor.directionsIncreasing.length; d++)
		{
			const direction = this.constructor.directionsIncreasing[d];
			const unblocked = this.constructor.squaresAttackedFromSquareInDirectionUnblocked(this.square, direction);

			const eitherBlockers = bothBits.extractBitsUsingSquareList(unblocked);
			const attackDistance = countTrailingZeroesInBitsPlus1IfNonzero(eitherBlockers, NUM_RANKS-1);
			squares.combine(this.constructor.squaresAttackedFromSquareInDirectionIncreasingBlocked_lookup[this.square][d][attackDistance]);

			const friendlyBlockers = friendlyBits.extractBitsUsingSquareList(unblocked);
			const friendlyDistance = countTrailingZeroesInBits(friendlyBlockers, NUM_RANKS-1);
			const opposingBlockers = opposingBits.extractBitsUsingSquareList(unblocked);
			const opposingDistance = countTrailingZeroesInBitsPlus1IfNonzero(opposingBlockers, NUM_RANKS-1);
			const moveDistance = Math.min(friendlyDistance, opposingDistance);
			moves.push(this.constructor.movesFromSquareInDirectionIncreasing_lookup[this.square][d][moveDistance]);
		}

		
		for(let d=0; d<this.constructor.directionsDecreasing.length; d++)
		{
			const direction = this.constructor.directionsDecreasing[d];
			const unblocked = this.constructor.squaresAttackedFromSquareInDirectionUnblocked(this.square, direction);
			const unblockedSquares = Array.from(unblocked).reverse();
			const eitherBlockers = bothBits.extractBitsUsingArray(unblockedSquares);
			const attackDistance = countTrailingZeroesInBitsPlus1IfNonzero(eitherBlockers, NUM_RANKS-1);
			squares.combine(this.constructor.squaresAttackedFromSquareInDirectionDecreasingBlocked_lookup[this.square][d][attackDistance]);

			const friendlyBlockers = friendlyBits.extractBitsUsingArray(unblockedSquares);
			const friendlyDistance = countTrailingZeroesInBits(friendlyBlockers, NUM_RANKS-1);
			const opposingBlockers = opposingBits.extractBitsUsingArray(unblockedSquares);
			const opposingDistance = countTrailingZeroesInBitsPlus1IfNonzero(opposingBlockers, NUM_RANKS-1);
			const moveDistance = Math.min(friendlyDistance, opposingDistance);
			moves.push(this.constructor.movesFromSquareInDirectionDecreasing_lookup[this.square][d][moveDistance]);
		}
		
		this.squaresAttacked.update(squares);
		this.basicMoves.update(moves);
	}

	addMovesToArray(array)
	{
		for(const list of this.basicMoves.get())
		{
			array.push(list);
		}
	}
}

//pieces whose moves are always a fixed pattern around their current square
class PatternPiece extends Piece
{
	static patternIncreasing;

	static squaresAttackedFromSquare_lookup;
	static movesFromSquare_lookup;
	
	static squaresAttackedFromSquareInGame(square, game)
	{
		const squareList = new SquareList();
	
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
				squareList.add(newSquare);
			}
		}
	
		return squareList;
	}

	static initClassLookups()
	{
		this.squaresAttackedFromSquare_lookup = Square.increasingFullArray().map((fromSquare)=>{
			return this.squaresAttackedFromSquareInGame(fromSquare);
		});

		this.movesFromSquare_lookup = Square.increasingFullArray().map((fromSquare)=>{
			return intsUpTo(1<<this.patternIncreasing.length).map((bits)=>{
				return this.squaresAttackedFromSquareInGame(fromSquare).squares().reduce((accumulator,toSquare,index)=>{
					const friendlyBlocking = ((bits>>index) & 1);
					if(!friendlyBlocking)
					{
						accumulator.push(new PlainMove(fromSquare, toSquare));
					}
					return accumulator;
				}, []);
			});
		});
	}

	constructor(game, team, square)
	{
		super(game, team, square);
	}

	updateSquaresAndMoves()
	{
		const squaresAttacked = this.constructor.squaresAttackedFromSquare_lookup[this.square];
		this.squaresAttacked.update(squaresAttacked);
		
		const friendlyBlockers = this.team.activePieceLocationsBitVector.extractBitsUsingSquareList(squaresAttacked);

		const basicMoves = this.constructor.movesFromSquare_lookup[this.square][friendlyBlockers];
		this.basicMoves.update(basicMoves);
	}
}

class King extends PatternPiece
{
	//King must update castle moves if own pieces move in/out of the way,
	//or if opposing pieces guarding intermediate squares are blocked etc.

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
	
	constructor(game, team, square)
	{
		super(game, team, square);
		this.castleRightsMask = 0;
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
	
	static directionsIncreasing = [
		[1,-1],
		[1,1]
	];
	static directionsDecreasing = [
		[-1,-1],
		[-1,1]
	];
}
Bishop.initClassLookups();

class Rook extends RangedPiece
{
	static typeChar = "R";
	static name = "rook";
	static points = 5;

	static directionsIncreasing = [
		[0,1],
		[1,0]
	];
	static directionsDecreasing = [
		[-1,0],
		[0,-1],
	];

	constructor(game, team, square, castleRightsMask=-1)
	{
		super(game, team, square);
		this.castleRightsMask = castleRightsMask;
	}
}
Rook.initClassLookups();

class Queen extends RangedPiece
{
	static typeChar = "Q";
	static name = "queen";
	static points = 9;

	static directionsIncreasing = [
		[0,1],
		[1,-1],
		[1,0],
		[1,1]
	];
	static directionsDecreasing = [
		[-1,-1],
		[-1,0],
		[-1,1],
		[0,-1],
	];
}
Queen.initClassLookups();

class Pawn extends BlockablePiece
{
	static typeChar = "P";
	static name = "pawn";
	static points = 1;
	
	static LONG_MOVE_RANK_INCREMENT_MULTIPLIER = 2;

	static squaresAttackedFromSquareInGameForTeam(square, game, team)
	{
		const squareList = new SquareList();
		
		const rank = Square.rank(square);
		const file = Square.file(square);
		const lessFile = file-1;
		const moreFile = file+1;
		const nextRank = rank+team.constructor.PAWN_RANK_INCREMENT;
		
		if(Square.validRankAndFile(nextRank,lessFile))
		{
			const captureSquare = Square.withRankAndFile(nextRank, lessFile);
			squareList.add(captureSquare);
		}
		if(Square.validRankAndFile(nextRank,moreFile))
		{
			const captureSquare = Square.withRankAndFile(nextRank, moreFile);
			squareList.add(captureSquare);
		}
		return squareList;
	}
	
	static squaresWatchedFromSquareInGameForTeam(square, game, team)
	{
		const squareList = new SquareList();
		const rank = Square.rank(square);
		const file = Square.file(square);
		
		const nextRank = rank+team.constructor.PAWN_RANK_INCREMENT;
		
		if(Square.validRankAndFile(nextRank, file))
		{
			const nextSquare = Square.withRankAndFile(nextRank, file);
			squareList.add(nextSquare);
			if(!(game.pieces[nextSquare]))
			{
				if(rank==team.constructor.PAWN_START_RANK)
				{
					const nextNextRank = rank+(this.LONG_MOVE_RANK_INCREMENT_MULTIPLIER*team.constructor.PAWN_RANK_INCREMENT);
					const nextNextSquare = Square.withRankAndFile(nextNextRank, file);
					squareList.add(nextNextSquare);
				}
			}
		}
		
		return squareList;
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
		
		this.squaresWatched = new Manager(new SquareList());
		
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
		this.squaresAttacked.update(squaresAttacked);
		
		const squaresWatched = this.constructor.squaresWatchedFromSquareInGameForTeam(this.square, this.game, this.team);
		this.squaresWatched.update(squaresWatched);
		
		const basicMoves = [];
		const specialMoves = [];
		
		this.squaresAttacked.get().squares().forEach((squareAttacked)=>{
			//only allow moves that capture a piece, from the opposing team
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
			else	//could still be en passant capture (opposing piece is not on target square)
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
		
		this.squaresWatched.get().squares().forEach((watchedSquare)=>{
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
	
	WINGS: WINGS,
}