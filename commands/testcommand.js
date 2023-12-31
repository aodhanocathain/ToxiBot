const Discord = require("discord.js");

const commandName = "testcommand";

module.exports = {
	name: commandName,
	discordCommand : new Discord.SlashCommandBuilder().setName(commandName).setDescription("Prompt acknowledgement by the bot"),
	execute: (interaction) => {
		return interaction.reply("Test command acknowledged");
	}
};
