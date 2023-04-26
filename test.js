const Discord = require("discord.js");

module.exports = {
	name: "test",
	discordCommand : new Discord.SlashCommandBuilder().setName("test").setDescription("Prompts acknowledgement by the bot"),
	execute: (interaction)=>{interaction.reply("Test");}
};