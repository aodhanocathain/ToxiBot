const Discord = require("discord.js");
const Canvas = require("canvas");
const FileSystem = require("fs");

const ROW_SQUARES = 8;
const SQUARE_PIXELS = 50;
const LIGHT_COLOUR = "#e0d0b0";
const DARK_COLOUR = "#e0a070";
const FONT_COLOUR = "#0000ff";

const boardToPngFile = async () => {
	const canvas = Canvas.createCanvas(ROW_SQUARES*SQUARE_PIXELS, ROW_SQUARES*SQUARE_PIXELS);
	const context = canvas.getContext("2d");
	context.font = `${SQUARE_PIXELS/4}px Arial`;	//SQUARE_PIXELS/4 is an arbitrarily chosen size

	const myimage = await Canvas.loadImage("./images/chess/white/king.png");
	for(let rank=ROW_SQUARES-1; rank>=0; rank--)
	{
		for(let file=0; file<ROW_SQUARES; file++)
		{
			//draw the current square according to its indices
			context.fillStyle = (((rank+file)%2) == 0) ?  DARK_COLOUR : LIGHT_COLOUR;
			const x = file*SQUARE_PIXELS;
			const y = ((ROW_SQUARES-1)-rank)*SQUARE_PIXELS;
			context.fillRect(x, y, SQUARE_PIXELS, SQUARE_PIXELS);
			
			//draw the square name e.g. "f3"
			context.fillStyle = FONT_COLOUR;
			const squareName = `${String.fromCharCode('a'.charCodeAt(0)+file)}${String.fromCharCode('1'.charCodeAt(0)+rank)}`;
			context.fillText(squareName, x, y+SQUARE_PIXELS);
			context.drawImage(myimage, x, y, SQUARE_PIXELS, SQUARE_PIXELS);
		}
	}
	const filename = "board.png";
	FileSystem.writeFileSync(filename, canvas.toBuffer("image/png"));
	return filename;
}

const gameCommand = (command) => {
	return command
	.setName("game")
	.setDescription("Play a chess game");
};

const pickRandomArrayElement = (array) => {
	return array[Math.floor(Math.random()*array.length)]
};

const commandName = "chess";

module.exports = {
	name: commandName,
	discordCommand : new Discord.SlashCommandBuilder().setName(commandName).setDescription("Utilize chess functionality")
	.addSubcommand(gameCommand),
	execute: (interaction) => {
		const subcommand = interaction.options.getSubcommand();
		if(subcommand=="game")
		{
			(async ()=>{
				const imageFileName = await boardToPngFile();
				const imageFileAttachment = new Discord.AttachmentBuilder(imageFileName);
				interaction.reply({files:[imageFileAttachment]});
			})();
		}
	}
};
