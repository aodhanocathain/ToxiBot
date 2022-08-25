const cmd = "chess";

const games = require("../utilities/games.js");
const {Arg, EnumArg, RangeArg, Option} = require("../utilities/args.js");

createdif = (message)=>{}

const teamarg = 
new EnumArg("team", "the colour pieces you want to control",
[
	new Option("white", "control the white pieces", {act: (message)=>{games.create(message);}}),
	new Option("black", "control the black pieces", {act: (message)=>{games.create(message);}}),
	new Option("random", "randomly assigns either the white pieces or the black pieces", {act: (message)=>{games.create(message);}})
]);

module.exports =
{
	init: function(bot)
	{
		games.init(bot);
	},
    name: cmd,
    summary: "Make use of chess functionality",
	arg: new EnumArg("subject", "what you want to do with the bot",
	[
		new Option("game", "game management and game settings",
		{
			arg: new EnumArg("interaction", "how you will administrate your game",
			[
				new Option("create", "start a new chess game",
				{
					arg: new EnumArg("difficulty", "bot AI strength",
					[
						new Option("easy", "ai makes random moves", {arg: teamarg}),
						new Option("hard", "ai makes what it thinks are best moves", {arg: teamarg})
					]),
				}),
				new Option("flip", "flip the board perspective", 
				{act: (message)=>
				{
					games.flip(message.author.username);
					message.channel.send(games.represent(message.author.username));
				}}),
				new Option("show", "show your current game", 
				{act: (message)=>
				{
					const representation = games.represent(message.author.username);
					message.channel.send(representation);
				}}),
				new Option("stop", "stop your current game", {act: (message)=>{games.stop(message.author.username);}}),
				new Option("simulate", "watch the bot play against itself", {act: (message)=>{games.input(message.author.username, `SIMULATE lol`)}}),
			]),
		}),
		new Option("move", "game progression / regression",
		{
			arg: new EnumArg("transition", "how you intend to proceed / receed",
			[
				new Option("best", "make the best move in your game", {act: (message)=>
				{
					games.input(message.author.username, `BEST lol`);
					games.input(message.author.username, `BEST lol`);
				}}),
				new Option("make", "make a specific move in your game",
				{
					arg: new RangeArg("specification", "format {current square}{new square} e.g. 'b1c3'",
					{
						verify: (choice)=>{return choice.length==4;},
						next: ()=>{return undefined;},
						act: (message, choices)=>
						{
							games.playturn(message, `MAKE ${choices[choices.length-1]}`)
						}
					}),
				}),
				new Option("random", "make a random move in your game", {act: (message)=>
				{
					games.input(message.author.username, `RANDOM lol`);
					games.input(message.author.username, `RANDOM lol`);
				}}),
				new Option("undo", "undo the last move in your game", {act: (message)=>
				{
					games.input(message.author.username, `UNDO lol`);
					games.input(message.author.username, `UNDO lol`);
				}}),
			])
		}),
		new Option("advice", "help from the bot regarding your game",
		{
			arg: new EnumArg("topic", "the matter you want help with",
			[
				new Option("legals", "see the legals moves in the current position", {act: (message)=>{games.input(message.author.username, `ADVISE legals`)}}),
				new Option("best", "see what the bot thinks the best move is in the current position", {act: (message)=>{games.input(message.author.username, `ADVISE best`)}})
			])
		}),
		new Option("analysis", "investiage a particular aspect of the game", {
			arg: new EnumArg("topic", "what you want to analyze", [
				new Option("move", "specify a move and see how the bot rates it", {
					arg: new RangeArg("specification", "move format: {current square}{new square} e.g. 'b1c3'",
					{
						verify: (choice)=>{return choice.length==4;},
						next: ()=>{return undefined;},
						act: (message, choices)=>
						{
							games.input(message.author.username, `EVAL ${choices[choices.length-1]}`)
						}
					}),
				}),
				new Option("game", "see how the bot rates your game position", {act: (message)=>{games.input(message.author.username, `ADVISE position`)}}),
			]),
		}),
	]),
    execute: function(message, choices, lastarg)
    {
		try
		{
			if(lastarg instanceof RangeArg)
			{
				lastarg.act(message, choices);
			}
			else
			{
				for(let i=0; i<lastarg.options.length; i++)
				{
					if(lastarg.options[i].name==choices[choices.length-1])
					{
						lastarg.options[i].act(message, choices);
						break;
					}
				}
			}
		}
		catch(error)
		{
			message.reply(`${error}`);
		}
	},
};