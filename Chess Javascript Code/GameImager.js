const {NUM_FILES, NUM_RANKS} = require("./Constants.js");
const {imageFileName} = require("./Helpers.js");
const {Square} = require("./Square.js");
const {WhiteTeam, BlackTeam} = require("./Team.js");
const Canvas = require("canvas");

module.exports = {
	gameToPNGBuffer: function(game)
	{
		const LIGHT_COLOUR = "#e0d0b0";
		const DARK_COLOUR = "#e0a070";
		const FONT_COLOUR = "#0000ff";
		
		const SQUARE_PIXELS = 50;

		const canvas = Canvas.createCanvas(NUM_FILES*SQUARE_PIXELS, NUM_RANKS*SQUARE_PIXELS);
		const context = canvas.getContext("2d");

		context.font = `${SQUARE_PIXELS/4}px Arial`;//SQUARE_PIXELS/4 is an arbitrarily chosen size

		const drawCalls = [];

		const lastLastMove = game.playedMoves[game.playedMoves.length-2] ?? {};
		const lastMove = game.playedMoves[game.playedMoves.length-1] ?? {};

		//draw the board bottom up so that higher squares' text does not get blocked by lower squares
		//start at the highest drawing rank, because highest coordinate is lowest on the display
		for(let drawRank=7; drawRank>=0; drawRank--)	//the "rank" on the drawn board, not necessarily the real rank
		{
			for(let drawFile=0; drawFile<NUM_FILES; drawFile++)	//the "file" on the drawn board, not necessarily the real file
			{
				//the game's square corresponding at the current draw position depends on the moving team (POV)
				const realRank = (game.movingTeam instanceof WhiteTeam)? (NUM_RANKS-1)-drawRank : drawRank;
				const realFile = (game.movingTeam instanceof WhiteTeam)? drawFile : (NUM_FILES-1)-drawFile;
				const square = Square.make(realRank,realFile);
				
				const x = drawFile*SQUARE_PIXELS;
				const y = drawRank*SQUARE_PIXELS;
				
				//colour the square
				const defaultColour = (((realRank+realFile)%2) == 0) ?  DARK_COLOUR : LIGHT_COLOUR;
				
				const fillColour = ((square == lastMove.mainBefore) || (square == lastMove.pieceEndSquare?.()))?
				(game.movingTeam.opposition.constructor.MOVE_COLOUR) : defaultColour;
				
				const borderColour = ((square == lastLastMove.mainBefore) || (square == lastLastMove.pieceEndSquare?.()))?
				(game.movingTeam.constructor.MOVE_COLOUR) : fillColour;
				
				const BORDER_WIDTH = 3;
				
				context.fillStyle = borderColour;
				context.fillRect(x, y, SQUARE_PIXELS, SQUARE_PIXELS);
				
				context.fillStyle = fillColour;
				context.fillRect(x+BORDER_WIDTH,y+BORDER_WIDTH,SQUARE_PIXELS-(2*BORDER_WIDTH),SQUARE_PIXELS-(2*BORDER_WIDTH));

				//draw a piece if one is present
				const piece = game.pieces[square];
				if(piece)
				{
					drawCalls.push(new Promise((resolve, reject)=>{
						Canvas.loadImage(imageFileName(piece.team.constructor.name, piece.constructor.name)).then((i)=>{
							context.drawImage(i, x, y, SQUARE_PIXELS, SQUARE_PIXELS);
							resolve("done");
						});
					}))
				}
				
				//annotate the square name e.g. "f3"
				context.fillStyle = FONT_COLOUR;
				context.fillText(Square.fullString(square), x, y+SQUARE_PIXELS);
			}
		}

		//make sure all pieces have been drawn
		return Promise.all(drawCalls).then(()=>{
			return canvas.toBuffer("image/png");
		});
	}
};