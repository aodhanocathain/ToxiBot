const {Manager} = require("./Manager.js");
const {Square} = require("./Square.js");
const {BitVector} = require("./BitVector.js");
const {PlainMove, CastleMove, EnPassantMove, PromotionMove} = require("./Move.js");
const {imageFileName, asciiDistance} = require("./Helpers.js");
const {MIN_FILE} = require("./Constants.js");
const Canvas = require("canvas");

class Piece
{
	static typeChar;
	static points;
	static name;
	
	static typeCharOfTeamedChar(teamedChar)
	{
		return teamedChar.toUpperCase();
	}
	
	static attackingDomainFromSquareInGame(square, game)
	{
		throw "attackingDomainFromSquareInGame called but not implemented";
	}
	
	static makeMoveString(move)
	{
		const game = move.game;
		//See what squares this type of piece could have come from to reach the new square
		const movingPiece = game.pieces[move.mainBefore]		
		let otherOrigins =
		this.attackingDomainFromSquareInGame(move.mainAfter,game).squares.filter((otherOrigin)=>{
			const otherPiece = game.pieces[otherOrigin];
			//ignore the square the moving piece came from
			if(movingPiece==otherPiece){return false;}
			//piece teams must match
			if(movingPiece.team!=otherPiece?.team){return false;}
			//piece types must match
			if(movingPiece.constructor!=otherPiece?.constructor){return false;}
			
			return true;
		})
		
		const sameOriginFiles = otherOrigins.filter((square)=>{return Square.file(move.mainBefore)==Square.file(square);});
		const sameOriginRanks = otherOrigins.filter((square)=>{return Square.rank(move.mainBefore)==Square.rank(square);});
		
		const beforeDetails = 
		(otherOrigins.length==0)?	//piece is the only possible candidate for the move, needs no clarification
		"":
		(sameOriginFiles.length==0)?	//need to uniquely identify piece by its file
		Square.fileString(move.mainBefore) :
		(sameOriginRanks.length==0)?	//need to uniquely identify piece by its rank
		Square.rankString(move.mainBefore) :
		//must fully specify the square the piece starts on
		Square.fullString(move.mainBefore);
		
		const capture = game.pieces[move.mainAfter]? "x" : "";
		
		game.makeMove(move);
		const checkStatus = 
		game.isCheckmate()? "#":
		game.kingChecked()? "+":
		"";
		game.undoMove();
		
		return `${movingPiece.constructor.typeChar}${beforeDetails}${capture}${Square.fullString(move.mainAfter)}${checkStatus}`;
	}
	
	game;
	team;
	square;
	
	attackingSquares;
	attackingBits;	//BitVector where a bit is set if its index is a square in attackingSquares
	
	kingSeer;	//1 if this piece currently sees the enemy king, 0 otherwise
	
	image;
	
	//set by the piece's team
	id;
	
	constructor(game, team, square)
	{
		this.game = game;
		this.team = team;
		this.square = square;
		
		this.attackingSquares = new Manager([]);
		this.attackingBits = new Manager(new BitVector());
		
		this.kingSeer = new Manager(0);
		
		this.image = Canvas.loadImage(imageFileName(this.team.constructor.name, this.constructor.name));
	}
	
	isActive()
	{
		return this.id in this.team.activePieces;
	}
	
	activate()
	{
		this.team.activatePiece(this);
	}
	
	deactivate()
	{
		this.team.deactivatePiece(this);
	}
	
	updateKingSeer()
	{
		//reflect the change of this piece's kingSeer value in its team
		const oldKingSeer = this.kingSeer.get();
		const newKingSeer = this.attackingBits.get().interact(BitVector.READ, this.team.opposition.king.square)
		this.kingSeer.update(newKingSeer);
		this.team.numKingSeers += newKingSeer - oldKingSeer;
	}
	
	revertKingSeer()
	{
		//reflect the change in whether this piece sees the king in its team
		const oldKingSeer = this.kingSeer.get();
		this.kingSeer.revert();
		const newKingSeer = this.kingSeer.get();
		this.team.numKingSeers += newKingSeer - oldKingSeer;
	}
	
	addAttackingMovesToArray(array)
	{
		this.attackingSquares.get().forEach((attackingSquare)=>{
			//only allow moves that do not capture pieces from the same team
			if(this.game.pieces[attackingSquare]?.team != this.team)
			{
				array.push(new PlainMove(this.game, this.square, attackingSquare));
			}
		});
	}
	
	addMovesToArray(array)
	{
		this.addAttackingMovesToArray(array);
	}
	
	updateKnowledge()
	{
		const attackingDomain = this.constructor.attackingDomainFromSquareInGame(this.square, this.game);
		this.attackingSquares.update(attackingDomain.squares);
		this.attackingBits.update(attackingDomain.bits);
		this.updateKingSeer();
	}
	
	revertKnowledge()
	{
		this.attackingSquares.revert();
		this.attackingBits.revert();
		this.revertKingSeer();
	}
	
	toString()
	{
		return `${this.team.constructor.charConverter(this.constructor.typeChar)}`;
	}
}

//pieces that update their knowledge when something happens in the range of squares they can see
class BlockablePiece extends Piece
{
	watchingBits;	//a BitVector where the set bits are at the indices of squares that trigger the knowledge update
}

//pieces whose moves extend out as far as possible in a set of directions
class RangedPiece extends BlockablePiece
{
	static directions;
	
	static attackingDomainFromSquareInGame(square, game)
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
				const newSquare = Square.make(newRank,newFile);
				
				//checking if the way is blocked AFTER adding the potentially blocked square is important
				//e.g. capturing a piece necessarily involves being able to move to the square that is blocked
				squaresArray.push(newSquare);
				squaresBits.interact(BitVector.SET, newSquare);
				
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
		this.watchingBits = this.attackingBits;
	}
}

//pieces whose moves are always a fixed pattern around their current square
class PatternPiece extends Piece
{
	static pattern;
	
	static attackingDomainFromSquareInGame(square, game)
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
				const newSquare = Square.make(newRank,newFile);
				squaresArray.push(newSquare);
				squaresBits.interact(BitVector.SET, newSquare);
			}
		}
	
		return {
			squares: squaresArray,
			bits: squaresBits
		};
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
	
	//assigned by the game upon piece creation
	canCastle;
	
	addMovesToArray(array)
	{
		this.addAttackingMovesToArray(array);
		
		//add castle moves if allowed
		//king must not have moved
		if(this.canCastle.get())
		{
			//can't castle to get out of check
			if(this.team.opposition.numKingSeers==0)
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
								const square = Square.make(this.team.constructor.BACK_RANK, i);
								noPiecesBetween = noPiecesBetween && !(this.game.pieces[square]);
							}
							
							if(noPiecesBetween)
							{
								const precastleFile = Square.file(this.team.constructor.STARTING_KING_SQUARE);
								const postcastleFile = Square.file(this.team.constructor.CASTLE_KING_SQUARES_BY_WINGCHAR[wingChar]);
								const middleFile = (precastleFile + postcastleFile)/2;	//assumes start square and castle square are 2 apart
								//can't castle through check
								const passingSquare = Square.make(this.team.constructor.BACK_RANK, middleFile);
								if(!(this.team.opposition.activePieces.some((piece)=>{
									return piece.attackingBits.get().interact(BitVector.READ, passingSquare);
								})))
								{
									array.push(new CastleMove(
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

//implement later
class Pawn extends BlockablePiece
{
	static typeChar = "P";
	static name = "pawn";
	static points = 1;
	
	static LONG_MOVE_RANK_INCREMENT_MULTIPLIER = 2;
	
	static attackingDomainFromSquareInGameForTeam(square, game, team)
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
			const captureSquare = Square.make(nextRank, lessFile);
			squares.push(captureSquare);
			bits.interact(BitVector.SET, captureSquare);
		}
		if(Square.validRankAndFile(nextRank,moreFile))
		{
			const captureSquare = Square.make(nextRank, moreFile);
			squares.push(captureSquare);
			bits.interact(BitVector.SET, captureSquare);
		}
		return {
			squares: squares,
			bits: bits
		};
	}
	
	static nonAttackingDomainFromSquareInGameForTeam(square, game, team)
	{
		const squares = [];
		const bits = new BitVector();
		const watch = new BitVector();
		
		const rank = Square.rank(square);
		const file = Square.file(square);
		
		const nextRank = rank+team.constructor.PAWN_RANK_INCREMENT;
		
		if(Square.validRankAndFile(nextRank, file))
		{
			const nextSquare = Square.make(nextRank, file);
			watch.interact(BitVector.SET, nextSquare);
			if(!(game.pieces[nextSquare]))
			{
				squares.push(nextSquare);
				bits.interact(BitVector.SET, nextSquare);
				if(rank==team.constructor.PAWN_START_RANK)
				{
					const nextNextRank = rank+(this.LONG_MOVE_RANK_INCREMENT_MULTIPLIER*team.constructor.PAWN_RANK_INCREMENT);
					const nextNextSquare = Square.make(nextNextRank, file);
					watch.interact(BitVector.SET, nextNextSquare);
					if(!(game.pieces[nextNextSquare]))
					{
						squares.push(nextNextSquare);
						bits.interact(BitVector.SET, nextNextSquare);
					}
				}
			}
		}
		
		return {
			squares: squares,
			bits: bits,
			watch: watch
		};
	}
	
	static makeMoveString(move)
	{
		const game = move.game;		
		
		//if there is a capture, include current file and capture character
		const beforeDetails = (game.pieces[move.mainAfter] || game.pieces[move.captureSquare])? `${Square.fileString(move.mainBefore)}x` : "";
		//the above will NOT work for en passant
		
		game.makeMove(move);
		const checkStatus = 
		game.isCheckmate()? "#":
		game.kingChecked()? "+":
		"";
		game.undoMove();
		
		const promotionString = (move instanceof PromotionMove)? `=${move.promotionClass.typeChar}`:"";
		
		return `${beforeDetails}${Square.fullString(move.mainAfter)}${promotionString}${checkStatus}`;
	}
	
	nonAttackingSquares;
	nonAttackingBits;
	
	constructor(game, team, square)
	{
		super(game, team, square);
		this.nonAttackingSquares = new Manager([]);
		this.nonAttackingBits = new Manager(new BitVector());
		
		this.watchingBits = new Manager(new BitVector());
	}
	
	addAttackingMovesToArray(array)
	{
		this.attackingSquares.get().forEach((attackingSquare)=>{
			//only allow moves that capture a piece, from the enemy team
			if(this.game.pieces[attackingSquare])	//direct capture (enemy piece is on the attacking square)
			{
				if(this.game.pieces[attackingSquare].team != this.team)
				{
					if(Square.rank(attackingSquare)==this.team.opposition.constructor.BACK_RANK)
					{
						array.push(new PromotionMove(this.game, this.square, attackingSquare, new Queen(this.game, this.team, this.square)));
						array.push(new PromotionMove(this.game, this.square, attackingSquare, new Rook(this.game, this.team, this.square)));
						array.push(new PromotionMove(this.game, this.square, attackingSquare, new Bishop(this.game, this.team, this.square)));
						array.push(new PromotionMove(this.game, this.square, attackingSquare, new Knight(this.game, this.team, this.square)));
					}
					else
					{
						array.push(new PlainMove(this.game, this.square, attackingSquare));
					}
				}
			}
			else	//could still be en passant capture (enemy piece is not on target square)
			{
				const enPassantFile = asciiDistance(this.game.enPassantable.get(), MIN_FILE);
				//if enPassantFile is adjacent to current file
				if(enPassantFile==Square.file(attackingSquare))
				{
					//if current rank is opponent long move rank
					const opponentLongMoveRank = 
					this.team.opposition.constructor.PAWN_START_RANK +
					(Pawn.LONG_MOVE_RANK_INCREMENT_MULTIPLIER*this.team.opposition.constructor.PAWN_RANK_INCREMENT);
					if(Square.rank(this.square)==opponentLongMoveRank)
					{
						const enPassantSquare = Square.make(opponentLongMoveRank,enPassantFile);
						array.push(new EnPassantMove(this.game, this.square, attackingSquare, enPassantSquare));
					}
				}
			}
		});
	}
	
	addNonAttackingMovesToArray(array)
	{
		this.nonAttackingSquares.get().forEach((nonAttackingSquare)=>{
			//only allow moves to empty squares
			if(!(this.game.pieces[nonAttackingSquare]))
			{
				if(Square.rank(nonAttackingSquare)==this.team.opposition.constructor.BACK_RANK)
				{
					array.push(new PromotionMove(this.game, this.square, nonAttackingSquare, new Queen(this.game, this.team, this.square)));
					array.push(new PromotionMove(this.game, this.square, nonAttackingSquare, new Rook(this.game, this.team, this.square)));
					array.push(new PromotionMove(this.game, this.square, nonAttackingSquare, new Bishop(this.game, this.team, this.square)));
					array.push(new PromotionMove(this.game, this.square, nonAttackingSquare, new Knight(this.game, this.team, this.square)));
				}
				else
				{
					array.push(new PlainMove(this.game, this.square, nonAttackingSquare));
				}
			}
		});
	}
	
	addMovesToArray(array)
	{
		this.addAttackingMovesToArray(array);
		this.addNonAttackingMovesToArray(array);
	}
	
	updateKnowledge()
	{
		const attackingDomain = this.constructor.attackingDomainFromSquareInGameForTeam(this.square, this.game, this.team);
		this.attackingSquares.update(attackingDomain.squares);
		this.attackingBits.update(attackingDomain.bits);
		
		const nonAttackingDomain = this.constructor.nonAttackingDomainFromSquareInGameForTeam(this.square, this.game, this.team);
		this.nonAttackingSquares.update(nonAttackingDomain.squares);
		this.nonAttackingBits.update(nonAttackingDomain.bits);
		
		this.watchingBits.update(nonAttackingDomain.watch);
		
		this.updateKingSeer();
	}
	
	revertKnowledge()
	{
		this.attackingSquares.revert();
		this.attackingBits.revert();
		
		this.nonAttackingSquares.revert();
		this.nonAttackingBits.revert();
		
		this.watchingBits.revert();
		
		this.revertKingSeer();
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