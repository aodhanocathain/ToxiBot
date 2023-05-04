const Discord = require("discord.js");

const commandName = "code";

module.exports = {
	name: commandName,
	discordCommand : new Discord.SlashCommandBuilder().setName(commandName).setDescription("View the bot's code"),
	execute: (interaction) => {
		return interaction.reply("https://github.com/aodhanocathain/ToxiBot");
	}
};