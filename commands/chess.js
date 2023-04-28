const Discord = require("discord.js");
const Canvas = require("canvas");
const FileSystem = require("fs");

const ROW_SQUARES = 8;
const SQUARE_PIXELS = 40;
const LIGHT_COLOUR = "#e0d0b0";
const DARK_COLOUR = "#e0a070";

const boardToPngFile = async () => {
	const canvas = Canvas.createCanvas(ROW_SQUARES*SQUARE_PIXELS, ROW_SQUARES*SQUARE_PIXELS);
	const context = canvas.getContext("2d");

	const myimage = await Canvas.loadImage("./images/chess/white/king.png");
	for(let row=0; row<ROW_SQUARES; row++)
	{
		for(let file=0; file<ROW_SQUARES; file++)
		{
			context.fillStyle = (((row+file)%2) == 0) ?  DARK_COLOUR : LIGHT_COLOUR;
			const x = ((ROW_SQUARES-1)-file) * SQUARE_PIXELS;
			const y = row*SQUARE_PIXELS;
			context.fillRect(((ROW_SQUARES-1)-file)*SQUARE_PIXELS, row*SQUARE_PIXELS, SQUARE_PIXELS, SQUARE_PIXELS);
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
