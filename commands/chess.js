const Discord = require("discord.js");
const FileSystem = require("fs");
const FENimager = require("../FENimager.js");

const gameCommand = (command) => {
	return command
	.setName("game")
	.setDescription("Play a chess game");
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
			const buffer = FENimager.FENStringToPNGBuffer("5N2/1p1kp2p/6r1/1Br2q1b/1Q1pK3/5B2/P2N3P/6R1 w - - 0 1");
			buffer.then((value)=>{
				interaction.reply({files: [value]});
			});
		}
	}
};
