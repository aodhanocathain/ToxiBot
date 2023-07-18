const Discord = require("discord.js");
const FileSystem = require("fs");
const {Game} = require("../Chess Javascript Code/Game.js");
const {TeamClassNames, TeamClassesArray} = require("../Chess Javascript Code/Team.js");
const commandName = "chess";

const users = {};
const games = {};

class DiscordGame
{
	game;
	display;
	
	botTeam;
	
	availableMoves;
	availableStrings;
	
	constructor(fen)
	{
		this.game = new Game(fen);
	}
	
	advanceIfBotTurn()
	{
		if(this.game.movingTeam == this.game[this.botTeam])
		{
			const bestMove = this.game.evaluate(2).bestMove;
			bestMove.takeStringSnapshot();
			this.game.makeMove(bestMove);
		}
	}
	
	makeMove(move)
	{
		move.takeStringSnapshot();
		this.game.makeMove(move);
		this.advanceIfBotTurn();
	}
	
	buildGameDisplayMessage()
	{
		const boardPictureBuffer = this.game.toPNGBuffer();
		const playedMovesString = this.game.moveHistoryString();
		const FENString = this.game.toString();
		
		this.availableMoves = this.game.calculateLegals();
		this.availableStrings = this.availableMoves.map((move)=>{move.takeStringSnapshot(); return move.string;});
		const availableMovesString = this.availableStrings.join("\t");
		
		//get the best line in string form
		const evaluation = this.game.evaluate(2);
		const bestLine = evaluation.reverseLine; bestLine.reverse();
		const bestLineString = bestLine.reduce((accumulator,move)=>{
			//make the moves to get their strings, then undo the moves
			accumulator = accumulator.concat(move.toString());
			this.game.makeMove(move);
			accumulator = accumulator.concat("\t");
			return accumulator;
		},"");
		for(const move of bestLine)
		{
			this.game.undoMove();
		}
		
		return boardPictureBuffer.then((boardPicture)=>{
			return {
				content: `**Played Moves**:\t${playedMovesString}\n`
				.concat(`**FEN String**:\t${FENString}\n`)
				.concat(`**Available Moves**:\t${availableMovesString}\n`)
				.concat(`**Toxibot's Evaluation**:\t||${evaluation.score}||\n`)
				.concat(`**Toxibot's Best Continuation**:\t||${bestLineString}||\n`),
				files: [boardPicture],
			}
		});
	}
}

class User
{
	discordGame;
	playas;
	
	opponent;
}

function gamecreateSubcommand(subcommand){
	return subcommand
	.setName("gamecreate")
	.setDescription("create your game")
	.addUserOption(playAgainstUserOption)
	.addStringOption(playAsStringOption)
	.addStringOption(fenStringOption)
}

function playAsStringOption(option)
{
	return option
	.setName("playas")
	.setDescription("white or black (leave blank for random assignment)")
	.setRequired(false);
}

function playAgainstUserOption(option)
{
	return option
	.setName("playagainst")
	.setDescription("the user you want to play against (leave blank for toxibot)")
	.setRequired(false);
}

function fenStringOption(option)
{
	return option
	.setName("fen")
	.setDescription("a FEN string describing the starting position")
	.setRequired(false)
}

function gameendSubcommand(subcommand)
{
	return subcommand
	.setName("gameend")
	.setDescription("end your game")
}

function gamebumpSubcommand(subcommand)
{
	return subcommand
	.setName("gamebump")
	.setDescription("show your game again in a new message")
}

function movemakeSubcommand(subcommand){
	return subcommand
	.setName("movemake")
	.setDescription("make a move in your game")
	.addStringOption(moveOption)
}

function moveOption(option){
	return option
	.setName("move")
	.setDescription("the move you want to make")
	.setRequired(true)
}

function moveundoSubcommand(subcommand)
{
	return subcommand
	.setName("moveundo")
	.setDescription("undo a move in your game")
}

module.exports = {
	name: commandName,
	configure: (client) => {},
	discordCommand : new Discord.SlashCommandBuilder().setName(commandName).setDescription("Utilize chess functionality")
	.addSubcommand(gamecreateSubcommand)
	.addSubcommand(gameendSubcommand)
	.addSubcommand(gamebumpSubcommand)
	.addSubcommand(movemakeSubcommand)
	.addSubcommand(moveundoSubcommand),
	
	execute: (interaction) => {
		const userId = interaction.user.id;
		if(!(userId in users)){users[userId] = new User();}
		const user = users[userId];
		
		const subcommand = interaction.options.getSubcommand();
		if(subcommand == "gamecreate")
		{
			//check if the command is feasible
			
			//do not overwrite existing games of the user
			if(user.discordGame)
			{
				return interaction.reply("You already have a game");
			}
			
			//do not overwrite existing games of the user's opponent
			const playagainst = interaction.options.getUser("playagainst");
			if(playagainst)
			{
				if(!(playagainst.id in users)){users[playagainst.id] = new User();}
				if(users[playagainst.id].discordGame)
				{
					return interaction.reply(`${playagainst.username} already has a game`);
				}
			}
			
			let playas = interaction.options.getString("playas");
			if(playas)	//can be wrong only if the user specified one at all
			{
				if(!(TeamClassNames.find((name)=>{return name==playas})))
				{
					return interaction.reply("Invalid team chosen");
				}
			}
			else
			{
				playas = TeamClassNames[Math.floor(Math.random()*TeamClassNames.length)];
			}
			
			let fen = interaction.options.getString("fen");
			if(fen)	//can be wrong only if the user specified one at all
			{
				if(!(Game.validFENString(fen)))
				{
					return interaction.reply("Invalid FEN string supplied");
				}
			}
			else
			{
				fen = Game.DEFAULT_FEN_STRING;
			}
			
			const discordGame = new DiscordGame(fen);
			
			user.discordGame = discordGame;
			user.playas = playas;
			
			const oppositionPlayAs = TeamClassNames.find((name)=>{return name!=playas});
			
			if(playagainst)
			{
				const opponent = users[playagainst.id];
				
				opponent.discordGame = discordGame;
				opponent.playas = oppositionPlayAs;
				
				user.opponent = opponent;
				opponent.opponent = user;
				
				discordGame.botTeam = null;
			}
			else
			{
				discordGame.botTeam = oppositionPlayAs;
			}
			
			//start the game by making the bot's move if it is the moving team
			discordGame.advanceIfBotTurn();
			
			console.log(user.playas);
			
			return discordGame.buildGameDisplayMessage().then((message)=>{
				discordGame.display = interaction;
				return interaction.reply(message);
			});
		}
		else if(subcommand == "gameend")
		{
			if(!(user.discordGame))
			{
				return interaction.reply("You have no game to end");
			}
			
			user.discordGame.display.deleteReply();
			delete user.discordGame;
			delete user.opponent?.discordGame;
			
			return;
		}
		else if(subcommand == "gamebump")
		{
			//show the game again in a new message and delete the old message
			if(!(user.discordGame))
			{
				return interaction.reply("You have no game to post again");
			}
			
			//delete old
			user.discordGame.display.deleteReply();
			
			//show new
			user.discordGame.display = interaction;
			return user.discordGame.buildGameDisplayMessage()
			.then((message)=>{
				return interaction.reply(message);
			});
		}
		else if(subcommand == "movemake")
		{
			if(!(user.discordGame))
			{
				return interaction.reply("You have no game in which to make a move");
			}
			
			if(user.discordGame.game[user.playas] != user.discordGame.game.movingTeam)
			{
				return interaction.reply("It is not your turn in the game");
			}
			
			if(user.discordGame.game.isCheckmate() || user.discordGame.game.isStalemate())
			{
				return interaction.reply("Your game is already over");
			}
			
			//if the choice string is not in the strings generated by the program then it is not available
			const moveChoiceString = interaction.options.getString("move");
			const moveIndex = user.discordGame.availableStrings.indexOf(moveChoiceString);
			if(moveIndex<0){return interaction.reply("The move supplied is invalid");}
			
			const moveChoice = user.discordGame.availableMoves[moveIndex]
			user.discordGame.makeMove(moveChoice);
			const response = user.discordGame.buildGameDisplayMessage().then((message)=>{
				return user.discordGame.display.editReply(message);
			});
			
			if(user.discordGame.game.isCheckmate())
			{
				const winningTeamName = user.discordGame.game.movingTeam.opposition.constructor.name;
				return interaction.reply(`The game has reached checkmate, the result is a win for ${winningTeamName}`);
			}
			else if(user.discordGame.game.isStalemate())
			{
				return interaction.reply("The game has reached stalemate, the result is a draw");
			}
			else
			{
				interaction.deferReply();
				interaction.deleteReply();
				return response;
			}
		}
		else if(subcommand == "moveundo")
		{
			if(!(user.discordGame))
			{
				return interaction.reply("No game in which to undo a move");
			}
			if(user.discordGame.game.playedMoves.length==0)
			{
				return interaction.reply("No move to undo");
			}
			
			interaction.deferReply();
			interaction.deleteReply();
			
			user.discordGame.game.undoMove();
			if(user.discordGame.game.playedMoves.length>0)
			{
				user.discordGame.game.undoMove();
			}
			user.discordGame.advanceIfBotTurn();
			return user.discordGame.buildGameDisplayMessage().then((message)=>{
				return user.discordGame.display.editReply(message);
			});
		}
	},
	exiter: (client)=>{
		Object.values(users).forEach(()=>{
			//gameDisplay?.deleteReply();
		})
	}
};
