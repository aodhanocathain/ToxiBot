const Discord = require("discord.js");

const fs = require("fs");
const util = require("util");

const remarks = require("./resources/remarks.js").remarks;

const Dotenv = require("dotenv");
Dotenv.config();

const BAIT = true;

let bot;

function startBot(baiting)
{
	bot = new Discord.Client();
	//load the commands
	bot.commands = new Discord.Collection();
	const commandFiles = fs.readdirSync("./commands");
	for(const file of commandFiles)
	{
		const command = require(`./commands/${file}`);
		bot.commands.set(command.name, command);
	}
	//configure its messaging behaviour
	configureBot();
	
	bot.once("ready", function()
	{
		bot.channels.fetch(process.env.WAKE_CHANNEL).then(channel => channel.send("I am online"));	//signal that it is ready
		if(baiting)	//restarting to troll people who try to use the shutdown command
		{
			const properties = JSON.parse(fs.readFileSync("./baiting.txt"));
			bot.channels.fetch(properties.channel_id)
			.then(channel => channel.messages.fetch(properties.message_id)
			.then(msg => 
			{
				msg.reply(util.format("\n> %s\nLol get played", msg.content));msg.react("🤡");
			}
			));
		}
	});
	bot.login(process.env.DISCORD_LOGIN);
}

function configureBot()
{
	bot.on("message", async (message) => 
	{
		if(message.author.id==bot.user.id){return;}	//ignore own messages
	
		let args = message.content.split(" ");
		if(args[0]==process.env.PREFIX)
		{
			if(args[1]=="shutdown")
			{
				//works if I use it
				//trolls other people who try to use shutdown
				fs.writeFileSync("./baiting.txt", `{"channel_id": "${message.channel.id}", "message_id": "${message.id}"}`);
				await message.channel.send("Shutting down");
				await bot.destroy();
				if(message.author.id!=process.env.OWNER_ID)
				{
					await sleep(20000);
					startBot(BAIT);
				}
			}
			else
			{
				let command = args[1];
				let subargs = args.slice(2);
				let properties = bot.commands.get(command);
				if(!properties){message.reply(`\n> ${message.content}\nThat's an unsupported command`); return;}
				try
				{
					properties.execute(message,subargs);
				}
				catch(error)
				{
					correct(message, error, properties);
				}
			}
		}
		else	//normal message
		{
			//with a certain probability, reply to random messages with a toxic statement
			const oneIn = 15;
			let index = Math.floor(Math.random()*remarks.length*oneIn);
			if(index<remarks.length){message.channel.send(remarks[index])};
		}	
	});
}

function correct(message, error, properties)
{
	//this part reports the error to the sender
	let response = `\n> ${message.content}\n${error}.`;
	
	//this part reminds the sender how to actually use the command
	response = util.format("%s\nProper usage:\t**%s %s ", response, process.env.PREFIX, properties.name);
	for(let i=0; i<properties.args.length; i++)
	{
		response = util.format("%s `%s`", response, properties.args[i]);	//define the command syntax
	}
	response = util.format("%s**\n", response);
	
	for(let i=0; i<properties.args.length; i++)
	{
		response = util.format("%s\n**`%s`**:\t%s", response, properties.args[i], properties.arginfo[i]);	//describe each parameter
	}
	message.reply(response);
}

function sleep(milliseconds)
{
	return new Promise(resolve => setTimeout(resolve, milliseconds))
}

startBot();