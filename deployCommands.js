require("dotenv").config();

const FileSystem = require("fs");
const Discord = require("discord.js");

const commandsDirectory = process.env.COMMANDS_DIRECTORY;
const commandFileNames = FileSystem.readdirSync(commandsDirectory);

const commands = [];
for(const commandFileName of commandFileNames)
{
	const commandProperties = require(`${commandsDirectory}/${commandFileName}`);
	commands.push(commandProperties.discordCommand.toJSON());
}

try
{
	new Discord.REST().setToken(process.env.DISCORD_TOKEN)
	.put(Discord.Routes.applicationCommands(process.env.APPLICATION_ID), {body: commands})
}
catch(error)
{
	console.error(error);
}