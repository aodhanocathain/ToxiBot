const Discord = require("discord.js");
const FileSystem = require("fs");
const Chess = require("../chess.js");

const commandName = "chess";

const users = {};

function gamecreateSubcommand(subcommand){
	return subcommand
	.setName("gamecreate")
	.setDescription("create your game")
	.addStringOption(fenStringOption)
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

function moveHistoryString(moveHistory)
{
	return moveHistory.reduce((accumulator, move, index)=>{
		//give the full move counter at the start of each full move
		if(index%2==0)
		{
			const fullMoveCounter = (index+2)/2;
			accumulator = accumulator.concat(`${fullMoveCounter>1?"\t":""}${fullMoveCounter}.`);
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
	const availableMovesString = Chess.AllLegalsInGame(user.game).join("\t");
	
	return boardPictureBuffer.then((boardPicture)=>{
		return {
			content: `**Played Moves**:\t${playedMovesString}\n`
			.concat(`**FEN String**:\t${FENString}\n`)
			.concat(`**Available Moves**:\t${availableMovesString}\n`),
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
			
			const fenString = interaction.options.getString("fen");
			
			//initialize the user
			users[userId] = {
				"game": Chess.FENStringToGame(fenString ?? Chess.DEFAULT_FEN_STRING),
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
			user.gameDisplay.deleteReply();	//also remove the message showing the game
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
			let response = buildGameMessageFromMove(interaction, moveChoice)
			.then((message)=>{
				return user.gameDisplay.editReply(message);
			});
			if(Chess.CheckmateInGame(user.game))
			{
				const winningTeam = (user.game.turn == Chess.WHITE)? Chess.BLACK : Chess.WHITE;
				return interaction.reply(`The game has reached checkmate, the result is a win for ${winningTeam==Chess.WHITE? "white" : "black"}`);
			}
			else if(Chess.StalemateInGame(user.game))
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
			return interaction.reply("not yet implemented");
		}
	},
	exiter: (client)=>{
		Object.values(users).forEach(({gameDisplay})=>{
			//gameDisplay?.deleteReply();
		})
	}
};
