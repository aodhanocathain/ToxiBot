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
const KNIGHT = "N";

const pieceLetters = [KING,KNIGHT];

//FEN strings denote white pieces in uppercase and black pieces in lowercase
const teamSetters = {
	[WHITE] : function(piece){return piece.toUpperCase();},
	[BLACK] : function(piece){return piece.toLowerCase();}
};

//every chess piece needs an image
const chessPieceImages = {
	[teamSetters[WHITE](KING)] : Canvas.loadImage(`./images/chess/white/king.png`),
	[teamSetters[BLACK](KING)] : Canvas.loadImage(`./images/chess/black/king.png`),
	[teamSetters[WHITE](KNIGHT)] : Canvas.loadImage(`./images/chess/white/knight.png`),
	[teamSetters[BLACK](KNIGHT)] : Canvas.loadImage(`./images/chess/black/knight.png`)
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
	const whitePiecesString = pieceLetters.map(teamSetters[WHITE]);
	const blackPiecesString = pieceLetters.map(teamSetters[BLACK]);
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
			return isPiece(character)? character : Array(parseInt(character)).fill(null);
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

const PieceDestinationsFromSquare = {
	[KING] : ({rank, file})=>{
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
	},
	[KNIGHT] : ({rank, file})=>{
		//the knight moves in an L shape (2 squares in a straight direction, then 1 square in a perpendicular direction)
		return {
			inGame: (game)=>{
				//the knight's pattern doesn't depend on the game position anyway
				return [
					Square(rank-2,file-1),
					Square(rank-2,file+1),
					Square(rank-1,file-2),
					Square(rank-1,file+2),
					Square(rank+1,file-2),
					Square(rank+1,file+2),
					Square(rank+2,file-1),
					Square(rank+2,file+1),
				]
				.filter(validSquare);
			}
		};
	}
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
		if(sameDestinationTransitions.length==0){
			//no other piece can reach the same destination, therefore move is already distinguished
			return distinguishedTransition;
		}
		
		const sameOriginFiles = sameDestinationTransitions.filter((t)=>{return t.before.file==pieceTransition.before.file});
		const sameOriginRanks = sameDestinationTransitions.filter((t)=>{return t.before.rank==pieceTransition.before.rank});
		
		if(sameOriginFiles.length==0)	//can uniquely identify piece by its file
		{
			distinguishedTransition.before.file=pieceTransition.before.file;
		}
		else if(sameOriginRanks.length==0)	//can uniquely identify piece by its rank
		{
			distinguishedTransition.before.rank=pieceTransition.before.rank;
		}
		else	//have to fully identify the square the piece is on
		{
			distinguishedTransition.before.file=pieceTransition.before.file;
			distinguishedTransition.before.rank=pieceTransition.before.rank;
		}
		return distinguishedTransition;
	});
}

function PieceMovesInGame(pieceConstant, game)
{
	const movingPiece = teamSetters[game.turn](pieceConstant);
	const locations = pieceLocationsInGame(movingPiece, game);
	const fullTransitions = locations.map((square)=>{
		return PieceDestinationsFromSquare[pieceConstant](square).inGame(game)
		.filter(({rank,file})=>{
			const capturedPiece = game.board[rank][file];
			return capturedPiece ?	//if the move would capture a piece of the same colour, it is forbidden
			capturedPiece != teamSetters[game.turn](capturedPiece) :
			true;
		})
		.map((destinationSquare)=>{
			return {"before":square,"after":destinationSquare};
		})
	})
	.flat(1)

	const distinguishedTransitions = distinguishTransitions(fullTransitions);
	
	return distinguishedTransitions.map((t)=>{
		//convert the transition to a move string
		const startFile = t.before.file? asciiOffset(START_FILE, t.before.file) : "";
		const startRank = t.before.rank? asciiOffset(START_RANK, t.before.rank) : "";
		const capture = game.board[t.after.rank][t.after.file] ? "x" : "";
		const endFile = asciiOffset(START_FILE, t.after.file);
		const endRank = asciiOffset(START_RANK, t.after.rank);
		return `${pieceConstant}${startFile}${startRank}${capture}${endFile}${endRank}`;
	});
}

function PieceLegalsInGame(pieceConstant, game)
{
	//legality here is defined as a move not leaving the king vulnerable to capture
	
	//the king that could potentially be captured
	const movingTeamKing = teamSetters[game.turn](KING);
	
	//determine legality by making a move and seeing if it leaves the king vulnerable
	return PieceMovesInGame(pieceConstant, game).filter((move)=>{
		//make the move in a copy of the game
		const progressedGame = GameCopy(game);
		MakeMoveInGame(move, progressedGame);
		//find where the king is
		const [kingLocation] = pieceLocationsInGame(movingTeamKing, progressedGame);
		const kingSquareName = squareName(kingLocation);
		//see if a reply by the other team can occupy the king's square
		const potentialReplies = AllMovesInGame(progressedGame);
		const replyDestinations = potentialReplies.map(moveComponents).map(({destination})=>{return destination});
		return replyDestinations.includes(kingSquareName)==false;
	});
}

function AllMovesInGame(game)
{
	return pieceLetters.reduce((accumulator, letter)=>{
		return accumulator.concat(PieceMovesInGame(letter,game));
	}, []);
}

function AllLegalsInGame(game)
{
	return pieceLetters.reduce((accumulator, letter)=>{
		return accumulator.concat(PieceLegalsInGame(letter,game));
	}, []);
}

function MakeMoveInGame(move, game)
{
	const movingTeamSetter = teamSetters[game.turn];
	const components = moveComponents(move);
	const movingPiece = movingTeamSetter(components.piece);
	if(components.piece == KING)
	{
		const [square] = pieceLocationsInGame(movingPiece, game);
		const oldFile = square.file;
		const oldRank = square.rank;
		const destinationName = components.destination;
		const newFile = asciiDistance(destinationName.charAt(0), START_FILE);
		const newRank = asciiDistance(destinationName.charAt(1), START_RANK);
		
		//remove from old square
		game.board[oldRank][oldFile] = null;
		//place in new square
		game.board[newRank][newFile] = movingPiece;
		
		//moving king forfeits castle rights
		game.castleRights = game.castleRights.filter((wing) => {
			//retain the castle rights of the other team
			return movingTeamSetter(wing) != wing;
		});
	}
	else if(components.piece == KNIGHT)
	{
		const destinationName = components.destination;
		const newFile = asciiDistance(destinationName.charAt(0), START_FILE);
		const newRank = asciiDistance(destinationName.charAt(1), START_RANK);
		const destinationSquare = Square(newRank, newFile);
		
		/*
		with multiple knights potentially able to move to the same square,
		check if the move has specified the square where the moving piece originates
		*/
		const fileFilter = components.originFile? 
		({rank,file})=>{return file==asciiDistance(components.originFile,START_FILE);} : (file)=>{return true;}
		const rankFilter = components.originRank?
		({rank,file})=>{return rank==asciiDistance(components.originRank,START_RANK);} : (rank)=>{return true;}
		
		//filter out all the locations except the one that matches the origin square	
		const locations = pieceLocationsInGame(movingPiece, game)
		.filter(rankFilter)
		.filter(fileFilter);
		
		//if only the destination was given in the move string, then all the knights are still accounted for
		//this means only 1 knight is actually able to reach the move destination
		
		//find the 1 knight whose possible destinations includes the move destination
		const [origin] = locations.filter((square)=>{
			const availableDestinations = PieceDestinationsFromSquare[KNIGHT](square).inGame(game);
			const canReachDestination = availableDestinations.findIndex((dest)=>{
				return sameSquare(dest, destinationSquare);
			}) >= 0;
			return canReachDestination;
		})
		
		const oldRank = origin.rank;
		const oldFile = origin.file;
		
		//remove from old square
		game.board[oldRank][oldFile] = null;
		//place in new square
		game.board[newRank][newFile] = movingPiece;
	}
	game.turn = (game.turn == WHITE ? BLACK : WHITE);
	game.enPassantable = "-";
	game.halfMove++;
	game.fullMove = 1 + Math.floor(game.halfMove/2);
}

module.exports = 
{
	DEFAULT_FEN_STRING : "1n2k1n1/8/8/8/8/8/8/1N2K1N1 w KQkq - 0 1",
	
	FENStringToGame : FENStringToGame,
	GameToFENString : GameToFENString,
	
	FENStringToPNGBuffer : FENStringToPNGBuffer,
	
	PieceMovesInGame: PieceMovesInGame,
	PieceLegalsInGame: PieceLegalsInGame,
	
	AllMovesInGame : AllMovesInGame,
	AllLegalsInGame : AllLegalsInGame,
	
	MakeMoveInGame : MakeMoveInGame
};