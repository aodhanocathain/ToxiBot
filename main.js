require("dotenv").config();

const Discord = require("discord.js");

const {DirectMessages, GuildMessages, Guilds, MessageContent} = Discord.GatewayIntentBits;
const bot = new Discord.Client({intents: [DirectMessages, GuildMessages, Guilds, MessageContent]});
bot.login(process.env.DISCORD_TOKEN);

bot.once(Discord.Events.ClientReady, (readyEvent)=>{
	bot.channels.fetch(process.env.WAKE_CHANNEL).then((channel)=>{
		channel.send("I am online.");
	});
});

bot.on(Discord.Events.MessageCreate, (message)=>{
	//no functionality for now, just log out when I send a text message
	if(message.author.id == process.env.OWNER_ID)
	{
		bot.destroy();
	}
});