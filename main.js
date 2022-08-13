/*
This module manages the bot itself
*/

const Discord = require("discord.js");
const fs = require("fs");
const remark = require("./utilities/remark.js");
const verifier = require("./utilities/verify.js");

require("dotenv").config();

let bot;

function startBot()
{
	bot = new Discord.Client();
	//load the commands
	bot.commands = {};
	const commandFiles = fs.readdirSync("./commands");
	for(const file of commandFiles)
	{
		const command = require(`./commands/${file}`);
		bot.commands[command.name] = command;
		if(command.init){command.init(bot);}
	}
	
	//configure its messaging behaviour
	configureBot();
	
	//ready for takeoff!
	bot.login(process.env.DISCORD_LOGIN);
}

function configureBot()
{
	bot.once("ready", function()
	{
		bot.channels.fetch(process.env.WAKE_CHANNEL).then(channel => channel.send("I am online"));	//signal that it is ready
	});
	
	bot.on("message", (message) => 
	{
		if(message.author.id==bot.user.id){return;}	//ignore own messages
	
		let args = message.content.split(" ");
		if(args[0]==process.env.PREFIX)	//some command
		{
			let command = args[1];
			let choices = args.slice(2);
			let properties = bot.commands[command];
			
			const correction = verifier.verify(message, choices, properties);
			if(correction)
			{
				message.react("❌");
				message.reply(correction);
			}
			else
			{
				message.react("✅");
				properties.execute(message, choices);
			}
		}
		else
		{
			//probabilistically respond with a funny statement
			if(remark.want()){remark.make(message.channel);}
		}	
	});
}

startBot();