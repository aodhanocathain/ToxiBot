const Canvas = require("canvas");
const FileSystem = require("fs");

const NUM_FILES = 8;
const NUM_RANKS = 8;
const SQUARE_PIXELS = 50;

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

const chessPieceImages = {
	[teamSetters[WHITE](KING)] : Canvas.loadImage(`./images/chess/white/king.png`),
	[teamSetters[BLACK](KING)] : Canvas.loadImage(`./images/chess/black/king.png`)
};

const START_FILE = "a";
const START_RANK = "1";

function asciiOffset(character, offset)
{
	return String.fromCharCode(character.charCodeAt(0) + offset);
}

function asciiDistance(character, baseCharacter)
{
	return character.charCodeAt(0) - baseCharacter.charCodeAt(0);
}

module.exports = 
{
	FENStringToGame : (FENString) => {		
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
	},
	
	KingMovesInGame : (game) => {
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
		.map(([rank, file])=>{
			const capture = game.board[rank][file]!=null;
			return `${KING}${capture?"x":""}${asciiOffset(START_FILE,file)}${asciiOffset(START_RANK,rank)}`;
		});
	},
	
	MakeMoveInGame : (move, game) => {
		const movingTeamSetter = teamSetters[game.turn];
		const movingPiece = movingTeamSetter(move.charAt(0));
		if(movingPiece == movingTeamSetter(KING))
		{
			const oldRank = game.board.findIndex((rank)=>{return rank.includes(movingPiece);});
			const oldFile = game.board[oldRank].indexOf(movingPiece);
			const newFile = asciiDistance(move.charAt(1), START_FILE);
			const newRank = asciiDistance(move.charAt(2), START_RANK);
			
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
		game.board.enPassantable = "-";
		game.halfMove++;
		game.fullMove = 1 + Math.floor(game.halfMove/2);
	},
	
	GameToFENString : (game) => {
		//game stores ranks in ascending order, must reverse for descending order in FEN string
		const boardString = game.board.reverse().map((rank)=>{
			let emptySquares = 0;
			return rank.reduce((accumulator, character)=>{
				if(character in chessPieceImages)
				{
					accumulator = accumulator.concat(`${emptySquares>0? emptySquares : ""}${character}`);
					emptySquares = 0;
					return accumulator;
				}
				else
				{
					emptySquares++;
					return accumulator;
				}
			}, "")
			.concat(`${emptySquares>0? emptySquares:""}`);
		}).join("/");
		return [boardString, game.turn, game.castleRights.join(""), game.enPassantable, game.halfMove, game.fullMove].join(" ");
	},
	
	FENStringToPNGBuffer : (FENString) => {
		const canvas = Canvas.createCanvas(NUM_FILES*SQUARE_PIXELS, NUM_RANKS*SQUARE_PIXELS);
		const context = canvas.getContext("2d");
		context.font = `${SQUARE_PIXELS/4}px Arial`;//SQUARE_PIXELS/4 is an arbitrarily chosen size
				
		//draw the board first
		for(let rank=0; rank<NUM_RANKS; rank++)
		{
			for(let file=0; file<NUM_FILES; file++)
			{
				//draw the current square according to its indices
				context.fillStyle = (((rank+file)%2) == 0) ?  DARK_COLOUR : LIGHT_COLOUR;
				const x = file*SQUARE_PIXELS;
				const y = ((NUM_RANKS-1)-rank)*SQUARE_PIXELS;
				context.fillRect(x, y, SQUARE_PIXELS, SQUARE_PIXELS);
				
				//annotate the square name e.g. "f3"
				context.fillStyle = FONT_COLOUR;
				const squareName = `${asciiOffset(START_FILE, file)}${asciiOffset(START_RANK, rank)}`;
				context.fillText(squareName, x, y+SQUARE_PIXELS);
			}
		}
		
		const game = module.exports.FENStringToGame(FENString);
		//draw pieces, if present
		return Promise.all(Object.values(chessPieceImages)).then((resolvedChessPieceImages)=>{
			game.board.forEach((rank, rankIndex)=>{
				rank.forEach((file, fileIndex)=>{
					const character = game.board[rankIndex][fileIndex];
					if(character in chessPieceImages)
					{
						const x = fileIndex*SQUARE_PIXELS;
						const y = ((NUM_FILES-1)-rankIndex)*SQUARE_PIXELS;
						const imageIndex = Object.keys(chessPieceImages).indexOf(character);
						context.drawImage(resolvedChessPieceImages[imageIndex], x, y, SQUARE_PIXELS, SQUARE_PIXELS);
					}
				});
			});
			return canvas.toBuffer("image/png");
		});
	}
};