const Discord = require("discord.js");
const FileSystem = require("fs");
const {Game} = require("../Chess Javascript Code/Game.js");
const {Team, Team0, Team1, TEAM_CLASSES} = require("../Chess Javascript Code/Team.js");
const commandName = "chess";

const usersById = {};

class DiscordGame
{
	game;
	display;
	
	botPlayas;
	
	//users
	discordUsersByPlayas;
	
	availableMoves;
	availableStrings;
	
	constructor(fen)
	{
		this.game = new Game(fen);
		this.discordUsersByPlayas = {};
	}
	
	isCheckmate()
	{
		//by definition
		return (this.game.calculateLegals().length == 0) && this.game.kingChecked();
	}

	isStalemate()
	{
		//by definition
		return (this.game.calculateLegals().length == 0) && !(this.game.kingChecked());
	}
	
	isBotTurn()
	{
		return this.game.movingTeam == this.game.teamsByName[this.botPlayas];
	}
	
	advanceIfBotTurn()
	{
		if(this.isBotTurn())
		{
			let bestMove = this.game.evaluate().bestMove;
			bestMove.takeStringSnapshot();
			this.game.makeMove(bestMove);
		}
	}
	
	advanceWithUserMove(move)
	{
		move.takeStringSnapshot();
		this.game.makeMove(move);
		if(this.game.calculateLegals().length>0)
		{
			this.advanceIfBotTurn();
		}
	}
	
	moveHistoryString()
	{
		//turn a list of moves into something like "1. whitemove blackmove 2.whitemove blackmove ..."
		//REQUIRES that move strings are generated in advance
		return this.game.playedMoves.reduce((accumulator, moveWithString, index)=>{
			//give the full move counter at the start of each full move
			if(index%2==0)
			{
				const fullMoveCounter = (index+2)/2;
				accumulator = accumulator.concat(`${fullMoveCounter>1?"\t":""}${fullMoveCounter}.`);
			}
			return accumulator.concat(` ${moveWithString.string}`);
		},"");
	}
	
	lineString(line)
	{
		//play each move in the line to obtain the next move's string
		//then undo the moves to retain current position	
		const string = line.reduce((accumulator,move,index)=>{
			if(index>0)
			{
				accumulator = accumulator.concat("\t");
			}
			accumulator = accumulator.concat(move.toString());
			this.game.makeMove(move);
			return accumulator;
		},"");
		for(const move of line)
		{
			this.game.undoMove();
		}
		
		return string;
	}
	
	scoreString(evaluation)
	{
		if("checkmate_in_halfmoves" in evaluation)
		{
			const teamToGiveMate = ((evaluation.checkmate_in_halfmoves % 2) == 0) ?
			this.game.movingTeam : this.game.movingTeam.opposition;
			const sign = teamToGiveMate instanceof Team0? "+" : "+";
			return `${sign}M${Math.floor((evaluation.checkmate_in_halfmoves+1)/2)}`;
		}
		else
		{
			return `${evaluation.score>0? "+":""}${evaluation.score}`;
		}
	}

	buildGameDisplayMessage()
	{
		const boardPictureBuffer = this.game.toPNGBuffer();
		const playedMovesString = this.moveHistoryString();
		const FENString = this.game.toString();
		
		this.availableMoves = this.game.calculateLegals();
		this.availableStrings = this.availableMoves.map((move)=>{move.takeStringSnapshot(); return move.string;});
		const availableMovesString = this.availableStrings.join("\t");
		
		//get the best line in string form
		const evaluation = this.game.evaluate(2);
		
		const bestLineString = this.lineString(evaluation.reverseLine?.slice().reverse() ?? []);
		const statusString = this.isCheckmate()? `${this.game.movingTeam.opposition.constructor.name} wins` :
		this.isStalemate()? "draw by stalemate" :
		this.scoreString(evaluation);
		
		return boardPictureBuffer.then((boardPicture)=>{
			return {
				content: `# (${Team0.name}) ${this.discordUsersByPlayas[Team0.name] ?? process.env.BOT_NAME} vs `
				.concat(`${this.discordUsersByPlayas[Team1.name] ?? process.env.BOT_NAME} (${Team1.name})\n`)
				.concat(`**Played Moves**:\t${playedMovesString}\n`)
				.concat(`**FEN String**:\t${FENString}\n`)
				.concat(`\n`)
				.concat(`**Available Moves**:\t${availableMovesString}\n`)
				.concat(`\n`)
				.concat(`**${process.env.BOT_NAME}'s Evaluation**:\t||${statusString}||\n`)
				.concat(`**${process.env.BOT_NAME}'s Best Continuation**:\t||${bestLineString==""?"none":bestLineString}||\n`),
				files: [boardPicture],
			}
		});
	}
}

class User
{
	discordGame;
	playas;
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
	.setDescription(`the user you want to play against (leave blank for ${process.env.BOT_NAME})`)
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
		if(!(userId in usersById)){usersById[userId] = new User();}
		const user = usersById[userId];
		
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
				if(playagainst.bot)
				{
					return interaction.reply("Challenging bot accounts is forbidden");
				}
				if(playagainst.id==interaction.user.id)
				{
					return interaction.reply("Challenging yourself is forbidden");
				}
				if(!(playagainst.id in usersById)){usersById[playagainst.id] = new User();}
				if(usersById[playagainst.id].discordGame)
				{
					return interaction.reply(`${playagainst.username} already has a game`);
				}
			}
			
			let playas = interaction.options.getString("playas");
			if(playas)	//can be wrong only if the user specified one at all
			{
				if(!(TEAM_CLASSES.find((teamClass)=>{return teamClass.name==playas})))
				{
					return interaction.reply("Invalid team chosen");
				}
			}
			else
			{
				playas = TEAM_CLASSES[Math.floor(Math.random()*TEAM_CLASSES.length)].name;
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
			
			//command is valid and feasible
			
			//set up the user and their game
			const discordGame = new DiscordGame(fen);
			user.discordGame = discordGame;
			user.playas = playas;
			discordGame.discordUsersByPlayas[playas] = interaction.user;
			
			//set up the user's opposition
			const oppositionPlayAs = TEAM_CLASSES.find((teamClass)=>{return teamClass.name!=playas}).name;
			if(playagainst)	//a real player
			{			
				const opponent = usersById[playagainst.id];
				
				opponent.discordGame = discordGame;
				opponent.playas = oppositionPlayAs;
				discordGame.discordUsersByPlayas[oppositionPlayAs] = playagainst;
				
				discordGame.botPlayas = null;
			}
			else	//the bot
			{
				discordGame.botPlayas = oppositionPlayAs;
			}
			
			//start the game by making the bot's move if it is the moving team
			discordGame.advanceIfBotTurn();
			
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
			Object.values(user.discordGame.discordUsersByPlayas).forEach((discordUser)=>{
				delete usersById[discordUser.id].discordGame;
			});
			
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
			
			if(user.discordGame.game.teamsByName[user.playas] != user.discordGame.game.movingTeam)
			{
				return interaction.reply("It is not your turn in the game");
			}
			
			if(user.discordGame.isCheckmate() || user.discordGame.isStalemate())
			{
				return interaction.reply("Your game is already over");
			}
			
			//if the choice string is not in the strings generated by the program then it is not available
			const moveChoiceString = interaction.options.getString("move");
			const moveIndex = user.discordGame.availableStrings.indexOf(moveChoiceString);
			if(moveIndex<0){return interaction.reply("The move supplied is invalid");}
			
			const moveChoice = user.discordGame.availableMoves[moveIndex]
			user.discordGame.advanceWithUserMove(moveChoice);
			const response = user.discordGame.buildGameDisplayMessage().then((message)=>{
				return user.discordGame.display.editReply(message);
			});
			
			if(user.discordGame.isCheckmate())
			{
				const winningTeamName = user.discordGame.game.teamsByName[user.playas].constructor.name;
				return interaction.reply(`The game has reached checkmate, the result is a win for ${winningTeamName}`);
			}
			else if(user.discordGame.isStalemate())
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
			
			if(user.discordGame.game.playedMoves.length>0)
			{
				user.discordGame.game.undoMove();
				//if the user is playing against the bot, undo another move to make it the user's turn
				if(user.discordGame.isBotTurn())
				{
					if(user.discordGame.game.playedMoves.length>0)
					{
						user.discordGame.game.undoMove();
					}
					else
					{
						user.discordGame.advanceIfBotTurn();
					}
				}
			}
			return user.discordGame.buildGameDisplayMessage().then((message)=>{
				return user.discordGame.display.editReply(message);
			});
		}
	},
	exiter: (client)=>{
		Object.values(usersById).forEach(()=>{
			//gameDisplay?.deleteReply();
		})
	}
};
