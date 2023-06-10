const Canvas = require("canvas");
const FileSystem = require("fs");

const NUM_FILES = 8;
const NUM_RANKS = 8;
const SQUARE_PIXELS = 50;

const START_FILE = "a";
const START_RANK = "1";

const LIGHT_COLOUR = "#e0d0b0";
const DARK_COLOUR = "#e0a070";
const FONT_COLOUR = "#0000ff";

const WHITE = "w";
const BLACK = "b";

const KING = "K";

//FEN strings denote white pieces in uppercase and black pieces in lowercase
const teamSetters = {
	[WHITE] : function(piece){return piece.toUpperCase();},
	[BLACK] : function(piece){return piece.toLowerCase();}
};

//every chess piece needs an image
const chessPieceImages = {
	[teamSetters[WHITE](KING)] : Canvas.loadImage(`./images/chess/white/king.png`),
	[teamSetters[BLACK](KING)] : Canvas.loadImage(`./images/chess/black/king.png`)
};

//helpful functions

function asciiOffset(character, offset)
{
	return String.fromCharCode(character.charCodeAt(0) + offset);
}

function asciiDistance(character, baseCharacter)
{
	return character.charCodeAt(0) - baseCharacter.charCodeAt(0);
}

function squareName({rank, file})
{
	const rankName = asciiOffset(START_RANK, rank);
	const fileName = asciiOffset(START_FILE, file);
	return `${fileName}${rankName}`;
}

function Square(rank, file)
{
	return {"rank":rank, "file":file};
}

function sameSquare(square1,square2)
{
	return (square1.rank==square2.rank) && (square1.file==square2.file);
}

function validSquare({rank, file})
{
	return (0 <= rank) && (rank < NUM_RANKS) && (0 <= file) && (file < NUM_FILES);
}

function isPiece(piece)
{
	//every piece has an image
	return piece in chessPieceImages;
}

function moveComponents(move)
{
	const piecesArray = [KING];
	const whitePiecesString = piecesArray.map(teamSetters[WHITE]);
	const blackPiecesString = piecesArray.map(teamSetters[BLACK]);
	const piecesString = whitePiecesString.concat(blackPiecesString).join("");
	
	const piece = `[${piecesString}]`;
	const originFile = `[${START_FILE}-${asciiOffset(START_FILE, NUM_FILES)}]`;
	const originRank = `[${START_RANK}-${asciiOffset(START_RANK, NUM_RANKS)}]`;
	const capture = "x";
	const destinationFile = originFile;
	const destinationRank = originRank;
	
	//capture parts of a move string
	const reg = new RegExp(`(${piece})(${originFile}?)(${originRank}?)(x?)(${destinationFile}${destinationRank})`);
	const components = move.match(reg);
	return {
		piece: components[1],
		originFile: components[2],
		originRank: components[3],
		capture: components[4],
		destination: components[5]
	};
}

function pieceLocationsInGame(piece, game)
{
	let locations = [];
	for(let rank=0; rank<NUM_RANKS; rank++)
	{
		for(let file=0; file<NUM_FILES; file++)
		{
			if(game.board[rank][file]==piece)
			{
				locations.push(Square(rank, file));
			}
		}
	}
	return locations;
}

//CHESS FUNCTIONS

function FENStringToGame(FENString)
{
	const FENparts = FENString.split(" ");
		
	const boardString = FENparts[0];
	//ranks are delimitted by "/" in FEN strings
	const rankStrings = boardString.split("/");
	//FEN strings give ranks in descending order, must reverse to construct board in ascending rank order
	const board = rankStrings.reverse().map((rankString)=>{
		const characters = rankString.split("");
		return characters.map((character)=>{
			//current character either denotes a piece or a number of empty squares
			return character in chessPieceImages? character : Array(parseInt(character)).fill(null);
		}).flat(1);
	})
	
	return {
		board: board,
		turn: FENparts[1],
		castleRights: FENparts[2].split(""),
		enPassantable: FENparts[3],
		halfMove: parseInt(FENparts[4]),
		fullMove: parseInt(FENparts[5])
	}
}

function GameToFENString(game)
{
	//game stores ranks in ascending order, must reverse a copy for descending order in FEN string
	const boardCopy = game.board.slice();
	const boardString = boardCopy.reverse().map((rankPieces)=>{
		let emptySquares = 0;
		let rankString = rankPieces.reduce((accumulator, piece)=>{
			if(isPiece(piece))
			{
				if(emptySquares>0)
				{
					//denote how many empty squares separate pieces
					accumulator = accumulator.concat(`${emptySquares}`);
					emptySquares = 0;
				}
				accumulator = accumulator.concat(`${piece}`);
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
	return [boardString, game.turn, game.castleRights.join(""), game.enPassantable, game.halfMove, game.fullMove].join(" ");
}

function GameCopy(game)
{
	//create a completely independent copy of the game
	return FENStringToGame(GameToFENString(game));
}

function FENStringToPNGBuffer(FENString)
{
	const canvas = Canvas.createCanvas(NUM_FILES*SQUARE_PIXELS, NUM_RANKS*SQUARE_PIXELS);
	const context = canvas.getContext("2d");
	context.font = `${SQUARE_PIXELS/4}px Arial`;//SQUARE_PIXELS/4 is an arbitrarily chosen size
	
	const game = FENStringToGame(FENString);
	//draw pieces, if present
	return Promise.all(Object.values(chessPieceImages)).then((resolvedChessPieceImages)=>{
		game.board.forEach((rankPieces, rank)=>{
			rankPieces.forEach((piece, file)=>{
				//colour this square
				context.fillStyle = (((rank+file)%2) == 0) ?  DARK_COLOUR : LIGHT_COLOUR;
				const x = file*SQUARE_PIXELS;
				const y = ((NUM_RANKS-1)-rank)*SQUARE_PIXELS;
				context.fillRect(x, y, SQUARE_PIXELS, SQUARE_PIXELS);
			
				//annotate the square name e.g. "f3"
				context.fillStyle = FONT_COLOUR;
				context.fillText(squareName(Square(rank,file)), x, y+SQUARE_PIXELS);

				//draw a piece if one is present
				const character = game.board[rank][file];
				if(isPiece(character))
				{
					const imageIndex = Object.keys(chessPieceImages).indexOf(character);
					context.drawImage(resolvedChessPieceImages[imageIndex], x, y, SQUARE_PIXELS, SQUARE_PIXELS);
				}
			});
		});
		return canvas.toBuffer("image/png");
	});
}

function KingDestinationsFromSquare({rank, file})
{
	//the king can move to any adjacent square
	return {
		inGame: (game)=>{
			//the king's pattern doesn't depend on the game position anyway
			return [
				Square(rank-1,file-1),
				Square(rank-1,file),
				Square(rank-1,file+1),
				Square(rank,file-1),
				Square(rank,file+1),
				Square(rank+1,file-1),
				Square(rank+1,file),
				Square(rank+1,file+1),
			]
			.filter(validSquare);
		}
	};
}

function distinguishTransitions(fullTransitions)
{
	/*
	fullTransitions is an array of transitions by pieces of the same type.
	Each transition has before.rank, before.file, after.rank and after.file and pertains to only one piece.
	
	In cases where pieces of the same type could move to the same square,
	move strings consisting of only the piece type and destination square
	would be ambiguous, because they would not describe which of the pieces moved.
	
	The point of this function is to remove any of the "before" components that are
	not required to unambiguously describe a move, by retaining what differs between
	the "before" components of transitions that have the same "after" components (destination).
	*/
	
	
	return fullTransitions.map((pieceTransition)=>{
		//find the transitions of other pieces that have the same destination
		const otherPieceTransitions = fullTransitions.filter((t)=>{
			//other pieces are on different squares
			return !sameSquare(t.before, pieceTransition.before);
		});
		const sameDestinationTransitions = otherPieceTransitions.filter((t)=>{
			return sameSquare(t.after, pieceTransition.after);
		});
		
		const distinguishedTransition = {before:{},after:pieceTransition.after};
		
		const sameOriginFiles = sameDestinationTransitions.filter((t)=>{return t.before.file==pieceTransition.before.file});
		if(sameOriginFiles.length>0)	//other transitions starting in the same file
		{
			//differentiate by rank, since other transitions dont start on the same square as pieceTransition
			distinguishedTransition.before.rank=pieceTransition.rank;
		}
		const sameOriginRanks = sameDestinationTransitions.filter((t)=>{return t.before.rank==pieceTransition.before.rank});
		if(sameOriginRanks.length>0)	//other transitions starting in the same rank
		{
			//differentiate by file, since other transitions dont start on the same square as pieceTransition
			distinguishedTransition.before.file=pieceTransition.file;
		}
		return distinguishedTransition;
	});
}

function KingMovesInGame(game)
{
	const movingKing = teamSetters[game.turn](KING);
	const [square] = pieceLocationsInGame(movingKing, game);
	const fullTransitions = KingDestinationsFromSquare(square).inGame(game)
	.map((destinationSquare)=>{
		return {"before":square,"after":destinationSquare};
	})
	.flat(1);
	const distinguishedTransitions = distinguishTransitions(fullTransitions);
	
	return distinguishedTransitions.map((t)=>{
		//convert the transition to a move string
		const startFile = t.before.file? asciiOffset(START_FILE, t.before.file) : "";
		const startRank = t.before.rank? asciiOffset(START_RANK, t.before.rank) : "";
		const capture = game.board[t.after.rank][t.after.file] ?? "";
		const endFile = asciiOffset(START_FILE, t.after.file);
		const endRank = asciiOffset(START_RANK, t.after.rank);
		return `${KING}${startFile}${startRank}${capture}${endFile}${endRank}`;
	});
}

function KingLegalsInGame(game)
{
	//check which moves leave the king vulnerable to capture
	return KingMovesInGame(game).filter((move)=>{
		const progressedGame = GameCopy(game);
		MakeMoveInGame(move, progressedGame);
		potentialReplies = AllMovesInGame(progressedGame);
		//king is vulnerable to capture if the reply's destination square is where the king moved to
		return potentialReplies.map(moveComponents).map(({destination})=>{return destination})
		.includes(moveComponents(move).destination)==false;
	});
}

function AllMovesInGame(game)
{
	return KingMovesInGame(game);
}

function AllLegalsInGame(game)
{
	return KingLegalsInGame(game);
}

function MakeMoveInGame(move, game)
{
	const movingTeamSetter = teamSetters[game.turn];
	const components = moveComponents(move);
	const movingPiece = movingTeamSetter(components.piece);
	if(movingPiece == movingTeamSetter(KING))
	{
		const [square] = pieceLocationsInGame(movingTeamSetter(KING), game);
		const oldFile = square.file;
		const oldRank = square.rank;
		const destination = components.destination;
		const newFile = asciiDistance(destination.charAt(0), START_FILE);
		const newRank = asciiDistance(destination.charAt(1), START_RANK);
		
		//remove from old square
		game.board[oldRank][oldFile] = null;
		//place in new square
		game.board[newRank][newFile] = movingPiece;
		
		//moving king forfeits all castle rights
		game.castleRights = game.castleRights.filter((wing) => {
			return movingTeamSetter(wing) != wing;
		});
	}
	game.turn = (game.turn == WHITE ? BLACK : WHITE);
	game.enPassantable = "-";
	game.halfMove++;
	game.fullMove = 1 + Math.floor(game.halfMove/2);
}

module.exports = 
{
	DEFAULT_FEN_STRING : "4k3/8/8/8/8/8/8/4K3 w KQkq - 0 1",
	
	FENStringToGame : FENStringToGame,
	GameToFENString : GameToFENString,
	
	FENStringToPNGBuffer : FENStringToPNGBuffer,
	
	KingMovesInGame : KingMovesInGame,
	KingLegalsInGame: KingLegalsInGame,
	
	AllMovesInGame : AllMovesInGame,
	AllLegalsInGame : AllLegalsInGame,
	
	MakeMoveInGame : MakeMoveInGame
};