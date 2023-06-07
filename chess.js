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

function isPiece(piece)
{
	//every piece has an image
	return piece in chessPieceImages;
}

function moveComponents(move)
{
	const piece = `[${KING}]`;
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
				context.fillText(squareName({"rank":rank,"file":file}), x, y+SQUARE_PIXELS);

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

function KingMovesInGame(game)
{
	//find the king that is moving
	const movingKing = teamSetters[game.turn](KING);
	const rank = game.board.findIndex((rank)=>{return rank.includes(movingKing);});
	const file = game.board[rank].indexOf(movingKing);
	//the king can move up to 1 square up or down and up to 1 square left or right
	return [-1,0,1].map((fileOffset)=>{
		return [-1,0,1].map((rankOffset)=>{
			return [rank+rankOffset, file+fileOffset];
		})
	})
	.flat(1)
	.filter(([newRank, newFile]) => {
		//must not exceed the boundaries of the board
		return 0 <= newRank && newRank < NUM_RANKS && 0 <= newFile && newFile < NUM_FILES;
	})
	.filter(([newRank, newFile]) => {
		//can't move from a square to itself
		return newRank != rank || newFile != file;
	})
	.map(([newRank, newFile])=>{
		//const capture = game.board[rank][file]!=null;
		const capture = false;
		return `${KING}${capture?"x":""}${asciiOffset(START_FILE,newFile)}${asciiOffset(START_RANK,newRank)}`;
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
		const oldRank = game.board.findIndex((rank)=>{return rank.includes(movingPiece);});
		const oldFile = game.board[oldRank].indexOf(movingPiece);
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