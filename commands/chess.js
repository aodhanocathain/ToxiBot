const Discord = require("discord.js");
const FileSystem = require("fs");
const {Game} = require("../Chess Javascript Code/Game.js");
const {WHITE_TEAM, BLACK_TEAM} = require("../Chess Javascript Code/Team.js");
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
		return accumulator.concat(` ${move.toString()}`);
	},"");
}

function buildGameMessageFromMove(interaction, move)
{
	const user = users[`${interaction.user.id}`];
	//apply the move in the user's game and return the necessary update to the original reply
	
	//make the move in the game
	if(move)
	{
		move.generateString();
		user.game.makeMove(move);
	}
	
	const boardPictureBuffer = user.game.toPNGBuffer();
	const playedMovesString = moveHistoryString(user.game.playedMoves);
	const FENString = user.game.toString();
	
	user.availableMoves = user.game.getLegals();
	user.availableMovesStrings = user.availableMoves.map((move)=>{move.generateString(); return move.toString();});
	
	const availableMovesString = user.availableMovesStrings.join("\t");
	
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
				"game": new Game(fenString??undefined),
				"availableMoves": [],
				"availableMovesStrings": [],
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
			delete user.availableMoves;
			delete user.availableMovesStrings;
			user.gameDisplay.deleteReply();	//also remove the message showing the game
			delete user.gameDisplay;
			return;
		}
		else if(subcommand == "gamebump")
		{
			//show the game again in a new message and delete the old message
			if(!userHasGame(user))
			{
				return interaction.reply("You have no game to post again");
			}
			
			//delete old
			user.gameDisplay.deleteReply();
			
			//show new
			user.gameDisplay = interaction;
			return buildGameMessageFromMove(interaction, null)
			.then((message)=>{
				return interaction.reply(message);
			});
		}
		else if(subcommand == "movemake")
		{
			if(!userHasGame(user))
			{
				return interaction.reply("You have no game in which to make a move");
			}
			
			if(user.game.isCheckmate() || user.game.isStalemate())
			{
				return interaction.reply("Your game is already over");
			}
			
			//if the choice string is not in the strings generated by the program then it is not available
			const moveChoiceString = interaction.options.getString("move");
			const moveIndex = user.availableMovesStrings.indexOf(moveChoiceString);
			if(moveIndex<0){return interaction.reply("The move supplied is invalid");}
			
			const moveChoice = user.availableMoves[moveIndex]
			let response = buildGameMessageFromMove(interaction, moveChoice).then((message)=>{
				user.gameDisplay.editReply(message);
			});
			
			if(user.game.isCheckmate())
			{
				const winningTeam = (user.game.turn == WHITE_TEAM)? BLACK_TEAM : WHITE_TEAM;
				return interaction.reply(`The game has reached checkmate, the result is a win for ${winningTeam==WHITE_TEAM? "white" : "black"}`);
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
			if(user.game.playedMoves.length==0)
			{
				return interaction.reply("No move to undo");
			}
			interaction.deferReply();
			interaction.deleteReply();
			user.game.undoMove();
			return buildGameMessageFromMove(interaction, null).then((message)=>{
				user.gameDisplay.editReply(message);
			});
		}
	},
	exiter: (client)=>{
		Object.values(users).forEach(({gameDisplay})=>{
			//gameDisplay?.deleteReply();
		})
	}
};
