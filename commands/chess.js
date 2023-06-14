const Discord = require("discord.js");
const FileSystem = require("fs");
const Chess = require("../chess.js");

const commandName = "chess";

const users = {};

function gamecreateSubcommand(subcommand){
	return subcommand
	.setName("gamecreate")
	.setDescription("create your game")
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

function moveHistoryString(moveHistory)
{
	return moveHistory.reduce((accumulator, move, index)=>{
		//give the full move counter at the start of each full move
		if(index%2==0)
		{
			const fullMoveCounter = (index+2)/2;
			accumulator = accumulator.concat(`\t${fullMoveCounter}.`);
		}
		return accumulator.concat(` ${move}`);
	},"");
}

function buildGameMessageFromMove(interaction, move)
{
	const user = users[`${interaction.user.id}`];
	//apply the move in the user's game and return the necessary update to the original reply
	
	//make the move in the game
	if(move)
	{
		Chess.MakeMoveInGame(move, user.game);
	}
	
	const boardPictureBuffer = Chess.GameToPNGBuffer(user.game);
	const playedMovesString = moveHistoryString(user.playedMoves);
	const FENString = Chess.GameToFENString(user.game);
	const availableMovesString = Chess.AllLegalsInGame(user.game).sort().join("\t");
	
	return boardPictureBuffer.then((boardPicture)=>{
		return {
			content: `**Played Moves**:${playedMovesString}\n`
			.concat(`**FEN String**:${FENString}\n`)
			.concat(`**Available Moves**:${availableMovesString}\n`),
			files: [boardPicture],
		}
	});
}

function userHasGame(user)
{
	return "game" in (user??{});
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
		const user = users[userId];
		
		const subcommand = interaction.options.getSubcommand();
		if(subcommand == "gamecreate")
		{
			if(userHasGame(user))
			{
				return interaction.reply("You already have a game");
			}
			
			//initialize the user
			users[userId] = {
				"game": Chess.FENStringToGame(Chess.DEFAULT_FEN_STRING),
				"playedMoves":[],
				"gameDisplay":interaction
			};
			
			return buildGameMessageFromMove(interaction, null)
			.then((message)=>{
				return interaction.reply(message);
			});
		}
		else if(subcommand == "gamedelete")
		{
			if(!userHasGame(user))
			{
				return interaction.reply("You have no game to delete");
			}
			
			//remove the user's properties concering the game
			delete user.game;
			delete user.playedMoves;
			user?.gameDisplay?.deleteReply();	//also remove the message showing the game
			delete user.gameDisplay;
			return;
		}
		else if(subcommand == "gamebump")
		{
			if(!userHasGame(user))
			{
				return interaction.reply("You have no game to post again");
			}
			
			user.gameDisplay.deleteReply();
			user.gameDisplay = interaction;
			return buildGameMessageFromMove(interaction, null).then((message)=>{
				return interaction.reply(message);
			});	
		}
		else if(subcommand == "movemake")
		{
			if(!userHasGame(user))
			{
				return interaction.reply("You have no game in which to make a move");
			}
			
			const moveChoice = interaction.options.getString("move");
			const moveChoices = Chess.AllLegalsInGame(user.game);
			
			if(!(moveChoices.includes(moveChoice)))
			{
				return interaction.reply("The move supplied is invalid");
			}
					
			user.playedMoves.push(moveChoice);
			return buildGameMessageFromMove(interaction, moveChoice)
			.then((message)=>{
				interaction.deferReply();
				interaction.deleteReply();
				return user.gameDisplay.editReply(message);
			});
		}
		else if(subcommand == "moveundo")
		{
			return interaction.reply("not yet implemented");
		}
	},
	exiter: (client)=>{
		Object.values(users).forEach(({gameDisplay})=>{
			gameDisplay?.deleteReply();
		})
	}
};
