const Discord = require("discord.js");
const FileSystem = require("fs");
const {Game} = require("../Chess Javascript Code/Game.js");
const commandName = "chess";

class User
{
	game;
	gameDisplay;
	
	availableMoves;
	availableStrings;
	
	initGameAndDisplay(FEN, interaction)
	{
		if(!(Game.validFENString(FEN)))
		{
			return interaction.reply("Invalid FEN string supplied");
		}
		
		this.game = new Game(FEN);
		this.gameDisplay = interaction;
		
		return this.buildGameDisplayMessage().then((message)=>{
			return interaction.reply(message);
		});
	}
	
	deleteGameAndDisplay()
	{
		delete this.game;
		delete this.availableMoves;
		delete this.availableStrings;
		
		this.gameDisplay.deleteReply();
		delete this.gameDisplay;
	}
	
	makeMove(move)
	{
		move.takeStringSnapshot();
		this.game.makeMove(move);
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

const users = {};

function gamecreateSubcommand(subcommand){
	return subcommand
	.setName("gamecreate")
	.setDescription("create your game")
	.addStringOption(playAsStringOption)
	.addStringOption(fenStringOption)
}

function playAsStringOption(option)
{
	return option
	.setName("playas")
	.setDescription(`"white" or "black" (leave empty for random assignment)`)
	.setRequired(false);
}

function fenStringOption(option)
{
	return option
	.setName("fen")
	.setDescription("a FEN string describing the starting position")
	.setRequired(false)
}

function gamedeleteSubcommand(subcommand)
{
	return subcommand
	.setName("gamedelete")
	.setDescription("delete your game")
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
	.addSubcommand(gamedeleteSubcommand)
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
			if(user.game)
			{
				return interaction.reply("You already have a game");
			}
			
			//experimental
			const playAs = interaction.options.getString("playas");
			console.log(playAs);
			
			const fenString = interaction.options.getString("fen");
			
			return user.initGameAndDisplay(fenString, interaction);
		}
		else if(subcommand == "gamedelete")
		{
			if(!(user.game))
			{
				return interaction.reply("You have no game to delete");
			}
			
			user.deleteGameAndDisplay();
			return;
		}
		else if(subcommand == "gamebump")
		{
			//show the game again in a new message and delete the old message
			if(!(user.game))
			{
				return interaction.reply("You have no game to post again");
			}
			
			//delete old
			user.gameDisplay.deleteReply();
			
			//show new
			user.gameDisplay = interaction;
			return user.buildGameDisplayMessage()
			.then((message)=>{
				return interaction.reply(message);
			});
		}
		else if(subcommand == "movemake")
		{
			if(!(user.game))
			{
				return interaction.reply("You have no game in which to make a move");
			}
			
			if(user.game.isCheckmate() || user.game.isStalemate())
			{
				return interaction.reply("Your game is already over");
			}
			
			//if the choice string is not in the strings generated by the program then it is not available
			const moveChoiceString = interaction.options.getString("move");
			const moveIndex = user.availableStrings.indexOf(moveChoiceString);
			if(moveIndex<0){return interaction.reply("The move supplied is invalid");}
			
			const moveChoice = user.availableMoves[moveIndex]
			user.makeMove(moveChoice);
			const response = user.buildGameDisplayMessage().then((message)=>{
				return user.gameDisplay.editReply(message);
			});
			
			if(user.game.isCheckmate())
			{
				const winningTeamName = user.game.movingTeam.opposition.constructor.name;
				return interaction.reply(`The game has reached checkmate, the result is a win for ${winningTeamName}`);
			}
			else if(user.game.isStalemate())
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
			if(!(user.game))
			{
				return interaction.reply("No game in which to undo a move");
			}
			if(user.game.playedMoves.length==0)
			{
				return interaction.reply("No move to undo");
			}
			
			interaction.deferReply();
			interaction.deleteReply();
			user.game.undoMove();
			return user.buildGameDisplayMessage().then((message)=>{
				return user.gameDisplay.editReply(message);
			});
		}
	},
	exiter: (client)=>{
		Object.values(users).forEach(({gameDisplay})=>{
			//gameDisplay?.deleteReply();
		})
	}
};
