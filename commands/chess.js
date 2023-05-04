const Discord = require("discord.js");
const FileSystem = require("fs");
const FEN = require("../FEN.js");

const actionOption = (option) => {
	return option
	.setName("action")
	.setDescription("take action")
	.setRequired(true)
	.addChoices(
	{name: "gamecreate", value:"gamecreate"},
	{name: "gameshow", value:"gameshow"},
	{name: "gameend", value:"gameend"}
	);
}

const commandName = "chess";

module.exports = {
	name: commandName,
	configure: (client) => {
		client.games = {};
	},
	discordCommand : new Discord.SlashCommandBuilder().setName(commandName).setDescription("Utilize chess functionality")
	.addStringOption(actionOption),
	execute: (interaction) => {
		const action = interaction.options.getString("action");
		if(action == "gamecreate")
		{
			if(interaction.client.games[`${interaction.user.id}`])
			{
				return interaction.reply("You already have an active game");
			}
			else
			{
				interaction.client.games[`${interaction.user.id}`] = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1\n";
				return;
			}
		}
		else if(action == "gameshow")
		{
			if(interaction.client.games[`${interaction.user.id}`])
			{
				const buffer = FEN.StringToPNGBuffer(interaction.client.games[`${interaction.user.id}`]);
				return buffer.then((value)=>{
					interaction.reply({files: [value]});
				});
			}
			else
			{
				return interaction.reply("You have no active game to show");
			}
		}
		else if(action == "gameend")
		{
			if(interaction.client.games[`${interaction.user.id}`])
			{
				delete interaction.client.games[`${interaction.user.id}`];
				return;
			}
			else
			{
				return interaction.reply("You have no active game to end");
			}
		}
	}
};
