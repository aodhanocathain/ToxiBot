const Discord = require("discord.js");

const commandName = "hodular";

module.exports = {
	name: commandName,
	discordCommand : new Discord.SlashCommandBuilder().setName(commandName).setDescription("Who is hodular?"),
	execute: (interaction) => {
		interaction.reply("Kaiwhungus and Moyler");
	}
};