const {Game} = require("../Chess Javascript Code/Game.js");
const {Team, WhiteTeam, BlackTeam, TEAM_CLASSES} = require("../Chess Javascript Code/Team.js");

const Discord = require("discord.js");
const commandName = "chess";

const playersById = {};
const doNotReplyWithOK = true;

class DiscordGame
{
	chessGame;
	IdsByTeamName;	//the players
	
	//updated internally
	availableMoves;
	availableStrings;
	
	//assigned by command handlers
	botTeam;
	interaction;
	
	constructor(fen)
	{
		this.chessGame = new Game(fen);
		this.IdsByTeamName = {};
	}
	
	end()
	{
		TEAM_CLASSES.forEach((teamClass)=>{
			delete playersById[this.IdsByTeamName[teamClass.name]]?.discordGame;
		});
		this.interaction.deleteReply();
	}
	
	isBotTurn()
	{
		return this.chessGame.movingTeam == this.botTeam;
	}
	
	advanceGameIfBotTurnAndEditInteraction()
	{
		//if it is the bot's turn and there are legal moves to play
		if(this.isBotTurn() && (this.chessGame.calculateLegals().length>0))
		{
			this.makeMoveAndEditInteraction(this.chessGame.evaluate().bestMove)
		}
	}
	
	makeMoveAndEditInteraction(move)
	{
		move.takeStringSnapshot();
		this.chessGame.makeMove(move);
		this.editInteraction();
	}
	
	undoMoveAndEditInteraction()
	{
		this.chessGame.undoMove();
		//if first undo gives turn to bot, must undo a second move to give turn to user
		if(this.isBotTurn())
		{
			if(this.chessGame.playedMoves.length>0)
			{
				this.chessGame.undoMove();
			}
			else	//no second move to undo, have to make a bot move to give turn back to user
			{
				const discordGame = this;
				setTimeout(()=>{
					discordGame.advanceGameIfBotTurnAndEditInteraction();
				}, 3000);
			}
		}
		this.editInteraction();
	}
	
	editInteraction()
	{
		this.buildDisplayMessage().then((updatedDisplayMessage)=>{
			return this.interaction.editReply(updatedDisplayMessage);
		});
	}

	buildDisplayMessage()
	{
		const boardPictureBuffer = this.chessGame.toPNGBuffer();
		const playedMovesString = this.chessGame.moveHistoryString();
		const FENString = this.chessGame.toString();
		
		this.availableMoves = this.chessGame.calculateLegals();
		this.availableStrings = this.availableMoves.map((move)=>{
			move.takeStringSnapshot();
			return move.string;
		});
		const availableMovesString = this.availableStrings.join("\t");
		
		//get the best line in string form
		const evaluation = this.chessGame.evaluate();
		
		const bestLineString = this.chessGame.lineString(evaluation.reverseLine?.slice().reverse() ?? []);
		const statusString = 
		this.chessGame.isCheckmate()? `${this.chessGame.movingTeam.opposition.constructor.name} wins` :
		this.chessGame.isStalemate()? "draw by stalemate" :
		this.chessGame.scoreString(evaluation);
		
		const team0Username = playersById[this.IdsByTeamName[WhiteTeam.name]]?.username ?? process.env.BOT_NAME;
		const team1Username = playersById[this.IdsByTeamName[BlackTeam.name]]?.username ?? process.env.BOT_NAME;
		
		return boardPictureBuffer.then((boardPicture)=>{
			return {
				content:`# (${WhiteTeam.name}) ${team0Username} vs ${team1Username} (${BlackTeam.name})\n`
				.concat(`**Played Moves**:\t${playedMovesString}\n`)
				.concat(`**FEN String**:\t${FENString}\n`)
				//.concat(`\n`)
				.concat(`**Available Moves**:\t${availableMovesString}\n`)
				//.concat(`\n`)
				.concat(`**${process.env.BOT_NAME}'s Evaluation**:\t||${statusString}||\n`)
				.concat(`**${process.env.BOT_NAME}'s Best Continuation**:\t||${bestLineString==""?"none":bestLineString}||\n`),
				files: [boardPicture],
			}
		});
	}
}

class Player
{
	username;
	
	//assigned by command handlers
	discordGame;
	team;
	
	constructor(username)
	{
		this.username = username;
	}
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
	const teamOptions = TEAM_CLASSES.reduce((accumulator, teamClass, index)=>{
		accumulator = accumulator.concat(teamClass.name);
		if(index != (TEAM_CLASSES.length-1))
		{
			accumulator = accumulator.concat(" or ");
		}
		return accumulator;
	}, "");
	return option
	.setName("playas")
	.setDescription(`${teamOptions} (leave blank for random assignment)`)
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
		const playerId = interaction.user.id;
		const player = playersById[playerId] = playersById[playerId] || new Player(interaction.user.username);
		
		const subcommand = interaction.options.getSubcommand();
		if(subcommand == "gamecreate")
		{
			//begin by checking whether the command is allowed
			
			//do not overwrite player's existing game
			if(player.discordGame)
			{
				return interaction.reply("You already have a game");
			}
			const playagainst = interaction.options.getUser("playagainst");
			//do not overwrite opponent's existing game
			if(playersById[playagainst?.id]?.discordGame)
			{
				return interaction.reply(`${playagainst.username} already has a game`);
			}
			//do not challenge bots (including ToxiBot)
			if(playagainst?.bot)
			{
				return interaction.reply("Challenging bot accounts is forbidden");
			}
			//do not challenge oneself
			if(playagainst?.id==playerId)
			{
				return interaction.reply("Challenging yourself is forbidden");
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
			discordGame.interaction = interaction;
			discordGame.IdsByTeamName[playas] = playerId;
			
			player.discordGame = discordGame;
			player.team = discordGame.chessGame.teamsByName[playas];
			
			//set up the user's opposition
			const opponentPlayAs = TEAM_CLASSES.find((teamClass)=>{return teamClass.name!=playas}).name;
			if(playagainst)	//a real player
			{			
				const opponent = playersById[playagainst.id] = playersById[playagainst.id] || new Player(playagainst.username);
				discordGame.IdsByTeamName[opponentPlayAs] = playagainst.id;
				
				opponent.discordGame = discordGame;
				opponent.team = discordGame.chessGame.teamsByName[opponentPlayAs];
				
				discordGame.botTeam = null;
			}
			else	//the bot
			{
				discordGame.botTeam = discordGame.chessGame.teamsByName[opponentPlayAs];
			}
			
			discordGame.buildDisplayMessage()
			.then((displayMessage)=>{
				interaction.reply(displayMessage);
				setTimeout(()=>{discordGame.advanceGameIfBotTurnAndEditInteraction();}, 3000);
			})
			
			return doNotReplyWithOK;
		}
		else if(subcommand == "gameend")
		{
			if(!(player.discordGame))
			{
				return interaction.reply("You have no game to end");
			}
			
			player.discordGame.end();
			
			return;
		}
		else if(subcommand == "gamebump")
		{
			//show the game again in a new message and delete the old message
			if(!(player.discordGame))
			{
				return interaction.reply("You have no game to post again");
			}
			
			//delete old
			player.discordGame.interaction.deleteReply();
			
			//show new
			player.discordGame.interaction = interaction;
			player.discordGame.buildDisplayMessage()
			.then((message)=>{interaction.reply(message);});
			
			return doNotReplyWithOK;
		}
		else if(subcommand == "movemake")
		{			
			if(!(player.discordGame))
			{
				return interaction.reply("You have no game in which to make a move");
			}
			
			if(player.team != player.discordGame.chessGame.movingTeam)
			{
				return interaction.reply("It is not your turn in the game");
			}
			
			if(player.discordGame.chessGame.isCheckmate() || player.discordGame.chessGame.isStalemate())
			{
				return interaction.reply("Your game is already over");
			}
			
			//if the choice string is not in the strings generated by the program then it is not available
			const moveChoiceString = interaction.options.getString("move");
			const moveIndex = player.discordGame.availableStrings.indexOf(moveChoiceString);
			if(moveIndex<0){return interaction.reply("The move supplied is invalid");}
			
			interaction.deferReply();
			interaction.deleteReply();
			
			const moveChoice = player.discordGame.availableMoves[moveIndex]
			
			player.discordGame.makeMoveAndEditInteraction(moveChoice);
			setTimeout(()=>{player.discordGame.advanceGameIfBotTurnAndEditInteraction();}, 3000);
			
			return doNotReplyWithOK;
		}
		else if(subcommand == "moveundo")
		{
			if(!(player.discordGame))
			{
				return interaction.reply("You have no game in which to undo a move");
			}
			if(player.discordGame.chessGame.playedMoves.length==0)
			{
				return interaction.reply("Your game has no move to undo");
			}
			
			interaction.deferReply();
			interaction.deleteReply();
			
			player.discordGame.undoMoveAndEditInteraction();
			
			return doNotReplyWithOK;
		}
	},
	exiter: (client)=>{}
};
