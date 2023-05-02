const Canvas = require("canvas");
const FileSystem = require("fs");

const RANK_SQUARES = 8;
const FILE_SQUARES = 8;
const SQUARE_PIXELS = 50;

const LIGHT_COLOUR = "#e0d0b0";
const DARK_COLOUR = "#e0a070";
const FONT_COLOUR = "#0000ff";

const chessPieceImages = {
	"K": Canvas.loadImage(`./images/chess/white/king.png`),
	"Q": Canvas.loadImage(`./images/chess/white/queen.png`),
	"R": Canvas.loadImage(`./images/chess/white/rook.png`),
	"B": Canvas.loadImage(`./images/chess/white/bishop.png`),
	"N": Canvas.loadImage(`./images/chess/white/knight.png`),
	"P": Canvas.loadImage(`./images/chess/white/pawn.png`),
	"k": Canvas.loadImage(`./images/chess/black/king.png`),
	"q": Canvas.loadImage(`./images/chess/black/queen.png`),
	"r": Canvas.loadImage(`./images/chess/black/rook.png`),
	"b": Canvas.loadImage(`./images/chess/black/bishop.png`),
	"n": Canvas.loadImage(`./images/chess/black/knight.png`),
	"p": Canvas.loadImage(`./images/chess/black/pawn.png`)
};

module.exports = 
{
	FENStringToPNGBuffer : (FENstring) => {
		const canvas = Canvas.createCanvas(RANK_SQUARES*SQUARE_PIXELS, RANK_SQUARES*SQUARE_PIXELS);
		const context = canvas.getContext("2d");
		context.font = `${SQUARE_PIXELS/4}px Arial`;	//SQUARE_PIXELS/4 is an arbitrarily chosen size
		
		//draw the board first
		for(let rank=RANK_SQUARES-1; rank>=0; rank--)
		{
			for(let file=0; file<RANK_SQUARES; file++)
			{
				//draw the current square according to its indices
				context.fillStyle = (((rank+file)%2) == 0) ?  DARK_COLOUR : LIGHT_COLOUR;
				const x = file*SQUARE_PIXELS;
				const y = ((RANK_SQUARES-1)-rank)*SQUARE_PIXELS;
				context.fillRect(x, y, SQUARE_PIXELS, SQUARE_PIXELS);
				
				//annotate the square name e.g. "f3"
				context.fillStyle = FONT_COLOUR;
				const squareName = `${String.fromCharCode('a'.charCodeAt(0)+file)}${String.fromCharCode('1'.charCodeAt(0)+rank)}`;
				context.fillText(squareName, x, y+SQUARE_PIXELS);
			}
		}
			
		const FENparts = FENstring.split(" ");
		//draw pieces on certain squares given the FEN string
		return Promise.all(Object.values(chessPieceImages)).then((resolvedChessPieceImages)=>{
			//scan the section that describes the board
			const boardString = FENparts[0];
			let squareIndex=0; let charIndex=0;
			while(squareIndex < RANK_SQUARES * FILE_SQUARES)
			{
				const character = boardString.charAt(charIndex);
				const imageIndex = Object.keys(chessPieceImages).indexOf(character);
				if(imageIndex>=0)
				{
					//FEN strings list files in ascending order, in rows of descending order
					const file = squareIndex % FILE_SQUARES;
					const rank = (RANK_SQUARES - 1) - Math.floor((squareIndex / FILE_SQUARES));						
					//coordinates for current square
					const x = file*SQUARE_PIXELS;
					const y = ((RANK_SQUARES-1)-rank)*SQUARE_PIXELS;
						
					//draw piece at coordinantes
					context.drawImage(resolvedChessPieceImages[imageIndex], x, y, SQUARE_PIXELS, SQUARE_PIXELS);
					squareIndex++;
				}
				else
				{
					if(character!="/")
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