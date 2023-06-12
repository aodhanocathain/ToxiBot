const Discord = require("discord.js");

const commandName = "fadular";

module.exports = {
	name: commandName,
	discordCommand : new Discord.SlashCommandBuilder().setName(commandName).setDescription("Who is fadular?"),
	execute: (interaction) => {
		return interaction.reply("Swonkity");
	}
};