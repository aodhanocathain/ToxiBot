require("dotenv").config();

const Discord = require("discord.js");

const commands = [];
try
{
	new Discord.REST().setToken(process.env.DISCORD_TOKEN)
	.put(Discord.Routes.applicationCommands(process.env.APPLICATION_ID), {body: commands})
}
catch(error)
{
	console.error(error);
}