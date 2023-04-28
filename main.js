require("dotenv").config();

const FileSystem = require("fs");
const Discord = require("discord.js");

const {DirectMessages, GuildMessages, Guilds, MessageContent} = Discord.GatewayIntentBits;
const bot = new Discord.Client({intents: [DirectMessages, GuildMessages, Guilds, MessageContent]});

bot.commandHandlers={};
const commandsDirectory = process.env.COMMANDS_DIRECTORY;
const commandFileNames = FileSystem.readdirSync(commandsDirectory);
for(const commandFileName of commandFileNames)
{
	const commandProperties = require(`${commandsDirectory}/${commandFileName}`);
	bot.commandHandlers[commandProperties.name] = commandProperties.execute;
}

bot.login(process.env.DISCORD_TOKEN);

bot.once(Discord.Events.ClientReady, (readyEvent)=>{
	bot.channels.fetch(process.env.WAKE_CHANNEL).then((channel)=>{
		channel.send("I am online.");
	});
});

bot.on(Discord.Events.MessageCreate, (message)=>{
	//no functionality other than interactions for now, just log out when I send a text message
	if(message.author.id == process.env.OWNER_ID)
	{
		bot.destroy();
	}
});

bot.on(Discord.Events.InteractionCreate, (interaction)=>{
	if(interaction.isChatInputCommand())
	{
		try
		{
			bot.commandHandlers[interaction.commandName](interaction);
		}
		catch(error)
		{
			interaction.reply("error");
		}
	}
});