const Discord = require("discord.js");

const commandName = "shutdown";

module.exports = {
	name: commandName,
	discordCommand : new Discord.SlashCommandBuilder().setName(commandName).setDescription("Shut down the bot"),
	execute: (interaction) => {
		//only shut down if the owner uses the command
		if(interaction.user.id == process.env.OWNER_ID)
		{
			Object.values(interaction.client.exiters).forEach((exiter)=>{
				exiter?.(interaction.client);
			});
			return interaction.reply("Ok").then(()=>{
				interaction.client.destroy()
			}).then(()=>{
				process.exit();
			});
		}
		else
		{
			return interaction.reply("Nope");
		}
	}
};