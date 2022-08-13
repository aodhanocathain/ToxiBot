const cmd = "chess";

const games = require("../utilities/games.js");

module.exports =
{
	init: function(bot)
	{
		games.init(bot);
	},
    name: cmd,
    summary: "Make use of chess functionality",
	arg: 
	{
		name: "subject",
		explanation: "what you want to do with the bot",
		options:
		{
			"game": 
			{
				summary: "for game management and game setting changes",
				arg:
				{
					name: "interaction",
					explanation: "how you will administrate your game",
					options:
					{
						"create":
						{
							summary: "start a new chess game",
						},
						"flip":
						{
							summary: "flip the board perspective",
						},
						"show":
						{
							summary: "show your current game",
						},
						"stop":
						{
							summary: "stop your current game",
						},
					},
				}
			},
			"move":
			{
				summary: "use for game progression and game regression",
				arg:
				{
					name: "transition",
					explanation: "how you intend to proceed/backtrack",
					options:
					{
						"make":
						{
							summary: "make a random move in your game",
						},
						"undo":
						{
							summary: "undo the last move in your game",
						}
					}
				}
			}
		},
	},
    execute: function(message, choices)
    {
	},
};