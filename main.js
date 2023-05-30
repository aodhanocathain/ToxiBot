require("dotenv").config();

const FileSystem = require("fs");
const Discord = require("discord.js");

const {DirectMessages, GuildMessages, Guilds, MessageContent} = Discord.GatewayIntentBits;
const bot = new Discord.Client({intents: [DirectMessages, GuildMessages, Guilds, MessageContent]});

//load command functionalities
bot.commandHandlers={};
bot.exiters={};
const commandsDirectory = process.env.COMMANDS_DIRECTORY;
const commandFileNames = FileSystem.readdirSync(commandsDirectory);
for(const commandFileName of commandFileNames)
{
	const commandProperties = require(`${commandsDirectory}/${commandFileName}`);
	bot.commandHandlers[commandProperties.name] = commandProperties.execute;
	if(commandProperties.exiter)
	{
		bot.exiters[commandProperties.name] = commandProperties.exiter;
	}
	if(commandProperties.configure)
	{
		commandProperties.configure(bot);
	}
}

bot.login(process.env.DISCORD_TOKEN);

//send a message to a special channel, indicating readiness
bot.once(Discord.Events.ClientReady, (readyEvent)=>{
	bot.channels.fetch(process.env.WAKE_CHANNEL).then((channel)=>{
		channel.send("I am online.");
	});
});

bot.on(Discord.Events.MessageCreate, (message)=>{
	//no functionality other than interactions for now
});

bot.on(Discord.Events.InteractionCreate, (interaction)=>{
	if(interaction.isChatInputCommand())
	{
		try
		{
			const response = bot.commandHandlers[interaction.commandName](interaction);
			if(!response)
			{
				interaction.reply("Ok");
			}
		}
		catch(error)
		{
			interaction.reply("error");
			console.error(error);
		}
	}
});