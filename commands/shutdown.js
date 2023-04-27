const Discord = require("discord.js");

const commandName = "shutdown";

module.exports = {
	name: commandName,
	discordCommand : new Discord.SlashCommandBuilder().setName(commandName).setDescription("Shut down the bot"),
	execute: (interaction) => {
		if(interaction.user.id == process.env.OWNER_ID)
		{
			interaction.reply("Ok")
			.then(()=>{interaction.client.destroy(); process.exit();});
		}
		else
		{
			interaction.reply("Nope");
		}
	}
};