const cmd = "shutdown";

const games = require("../utilities/games.js");

let bot;

function sleep(milliseconds)
{
	return new Promise(resolve => setTimeout(resolve, milliseconds))
}

module.exports =
{
	init: function(botref)
	{
		bot = botref;
		games.init(botref);
	},
	name: cmd,
	summary: "Shut down the bot",
	arg: undefined,
	
	execute: async function(message, choices)
	{
		await message.channel.send("Shutting down.");
		//works only if I use it, trolls other people who try to use shutdown
		if(message.author.id!=process.env.OWNER_ID)
		{
			bot.user.setStatus("Invisible");
			await sleep(10000);
			bot.user.setStatus("Online");
			message.reply("https://tenor.com/view/rick-rickroll-jebaited-meme-got-em-gif-17877057");
		}
		else
		{
			for(const key of Object.keys(bot.games))
			{
				games.stop(key);
			}
			bot.destroy();
		}
	}
}