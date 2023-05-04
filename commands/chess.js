const Discord = require("discord.js");
const FileSystem = require("fs");
const FEN = require("../FEN.js");

const actionOption = (option) => {
	return option
	.setName("action")
	.setDescription("take action")
	.setRequired(true)
	.addChoices({name: "gamecreate", value:"gamecreate"});
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
				interaction.reply("You already have an active game");
			}
			else
			{
				interaction.client.games[`${interaction.user.id}`] = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1\n";
			}
		}
		else if(action == "gameshow")
		{
			
		}
		else
		{
			console.log(`The action option was ${action}`);
		}
			
		if(interaction.client.games[`${interaction.user.id}`])
		{
			const buffer = FEN.StringToPNGBuffer(interaction.client.games[`${interaction.user.id}`]);
			buffer.then((value)=>{
				interaction.reply({files: [value]});
			});
		}
		else
		{
			console.log(`no ${interaction.user.username} game in client.games: ${client.games}`);
		}
	}
};
