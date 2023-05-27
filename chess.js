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

const teamSetters = {
	[WHITE] : function(piece){return piece.toUpperCase();},
	[BLACK] : function(piece){return piece.toLowerCase();}
};

const chessPieceImages = {
	[white(KING)] : Canvas.loadImage(`./images/chess/white/king.png`),
	[black(KING)] : Canvas.loadImage(`./images/chess/black/king.png`),
};

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
		const movingKing = teamSetters[game.turn](KING);
		const rank = game.board.findIndex((rank)=>{return rank.includes(movingKing);});
		const file = game.board[rankIndex].indexOf(movingKing);
		
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
			return `${KING}${capture?"x":""]}${rank}${file}`;
		});
	},
	
	MakeMoveInGame : (move, game) => {
		const movingTeamSetter = teamSetters[game.turn];
		const movingPiece = movingTeamSetter(move.charAt(0));
		if(movingPiece == movingTeamSetter(KING))
		{
			const fromSquareIndex = game.board.indexOf(movingPiece);
			const toSquareCharIndex = move.charAt(1)=="x"? 2 : 1;
			const newSquareName = move.slice(toSquareCharIndex, toSquareCharIndex + 2);
			const toSquareIndex = 
			((newSquareName.charCodeAt(1)-'1'.charCodeAt(0)) * NUM_FILES) + 
			(newSquareName.charCodeAt(0)-'a'.charCodeAt(0));
			
			game.board[fromSquareIndex] = null;
			game.board[toSquareIndex] = movingPiece;
			game.board.enPassantable = null;
			game.castleRights = game.castleRights.filter((wing) => {
				return wing != movingTeamSetter(KING);
			});
		}
		game.halfMove++;
		game.fullMove = Math.floor(halfMove/2);
		game.turn = (game.turn == WHITE ? BLACK : WHITE);
	},
	
	GameToFENString : (game) => {
		let boardString = ``;
		for(let rank = NUM_RANKS - 1; rank >= 0; rank--)
		{
			let emptySquares = 0;
			for(let file = 0; file < NUM_FILES; file++)
			{
				const index = (rank * NUM_FILES) + file;
				const character = game.board[index];
				if(character == null)
				{
					emptySquares++;
					continue;
				}
				else
				{
					boardString = `${boardString}${emptySquares>0?emptySquares:""}${character}`;
					emptySquares = 0;
				}
			}
			
			boardString = `${boardString}${emptySquares>0?emptySquares:""}${rank>0? "/" : ""}`;
		}
		return boardString;
	},
	
	FENStringToPNGBuffer : (FENString) => {
		const canvas = Canvas.createCanvas(NUM_FILES*SQUARE_PIXELS, NUM_RANKS*SQUARE_PIXELS);
		const context = canvas.getContext("2d");
		context.font = `${SQUARE_PIXELS/4}px Arial`;//SQUARE_PIXELS/4 is an arbitrarily chosen size
		
		//draw the board first
		for(let rank=NUM_RANKS-1; rank>=0; rank--)
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
				const squareName = `${String.fromCharCode('a'.charCodeAt(0)+file)}${String.fromCharCode('1'.charCodeAt(0)+rank)}`;
				context.fillText(squareName, x, y+SQUARE_PIXELS);
			}
		}
			
		const FENparts = FENString.split(" ");
		//draw pieces on certain squares given the FEN string
		return Promise.all(Object.values(chessPieceImages)).then((resolvedChessPieceImages)=>{
			//scan the section that describes the board
			const boardString = FENparts[0];
			let squareIndex=0; let charIndex=0;
			while(charIndex < boardString.length)
			{
				const character = boardString.charAt(charIndex);
				const imageIndex = Object.keys(chessPieceImages).indexOf(character);
				if(imageIndex>=0)	//current character from FENString indicates a piece, e.g. "k"
				{
					//FEN strings list files in ascending order, in rows of descending order
					//squareIndex variable increases by 1 per file in a row, so by 8 per row in the board
					const file = squareIndex % NUM_FILES;
					const rank = (NUM_RANKS - 1) - Math.floor((squareIndex / NUM_FILES));						
					//coordinates for current square
					const x = file*SQUARE_PIXELS;
					const y = ((NUM_RANKS-1)-rank)*SQUARE_PIXELS;
						
					//draw piece at coordinantes
					context.drawImage(resolvedChessPieceImages[imageIndex], x, y, SQUARE_PIXELS, SQUARE_PIXELS);
					squareIndex++;
				}
				else	//current character either indicates a number of empty squares or a new rank
				{
					if(character!="/")	//must indicate a number of empty squares
					{
						squareIndex+=parseInt(character);
					}
				}
				charIndex++;
			}
			return canvas.toBuffer("image/png");
		});
	}
};