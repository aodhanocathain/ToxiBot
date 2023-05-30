const Discord = require("discord.js");
const FileSystem = require("fs");
const Chess = require("../chess.js");

const actionOption = (option) => {
	return option
	.setName("action")
	.setDescription("take action")
	.setRequired(true)
	.addChoices(
	{name: "gamecreate", value:"gamecreate"},
	{name: "gameshow", value:"gameshow"},
	{name: "gameend", value:"gameend"},
	{name: "getFEN", value:"getFEN"}
	);
}

const commandName = "chess";

module.exports = {
	name: commandName,
	configure: (client) => {
		client.interactions = {};
		client.games = {};
	},
	discordCommand : new Discord.SlashCommandBuilder().setName(commandName).setDescription("Utilize chess functionality")
	.addStringOption(actionOption),
	execute: (interaction) => {
		const action = interaction.options.getString("action");
		if(action == "gamecreate")
		{
			if(interaction.client.games[`${interaction.user.id}`])
			{
				return interaction.reply("You already have an active game");
			}
			else
			{
				//interaction.client.games[`${interaction.user.id}`] = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1\n";
				interaction.client.games[`${interaction.user.id}`] = "4k3/8/8/8/8/8/8/4K3 w KQkq - 0 1\n";
				return;
			}
		}
		else if(action == "gameshow")
		{
			if(interaction.client.interactions[`${interaction.user.id}`])
			{
				interaction.client.interactions[`${interaction.user.id}`].deleteReply();
			}
			interaction.client.interactions[`${interaction.user.id}`] = interaction;
						
			if(interaction.client.games[`${interaction.user.id}`])
			{
				const buffer = Chess.FENStringToPNGBuffer(interaction.client.games[`${interaction.user.id}`]);
				const moveList = Chess.KingMovesInGame(Chess.FENStringToGame(interaction.client.games[`${interaction.user.id}`]));
				const moveSelectMenu = new Discord.StringSelectMenuBuilder().setCustomId("move").setPlaceholder("Choose a move")
				.addOptions(...moveList.map((move)=>{
						return new Discord.StringSelectMenuOptionBuilder().setLabel(move).setValue(move)
					})
				)
				
				return buffer.then((value)=>{
					interaction.reply({
						files: [value],
						components: [new Discord.ActionRowBuilder().addComponents(moveSelectMenu)]
					})
					.then((response)=>{
						const collector = response.createMessageComponentCollector();
						
						collector.on("collect", (selection)=>{
							const [move] = selection.values;
							const game = Chess.FENStringToGame(interaction.client.games[`${interaction.user.id}`]);
							Chess.MakeMoveInGame(move, game);
							interaction.client.games[`${interaction.user.id}`] = Chess.GameToFENString(game);
							const buffer = Chess.FENStringToPNGBuffer(interaction.client.games[`${interaction.user.id}`]);
							const moveList = Chess.KingMovesInGame(Chess.FENStringToGame(interaction.client.games[`${interaction.user.id}`]));
							const moveSelectMenu = new Discord.StringSelectMenuBuilder().setCustomId("move").setPlaceholder("Choose a move")
							.addOptions(...moveList.map((move)=>{
								return new Discord.StringSelectMenuOptionBuilder().setLabel(move).setValue(move)
							})
							)
							buffer.then((value)=>{
								selection.update({
									files: [value],
									components: [new Discord.ActionRowBuilder().addComponents(moveSelectMenu)]
								});
							});
						})
					});
				});
			}
			else
			{
				return interaction.reply("You have no active game to show");
			}
		}
		else if(action == "gameend")
		{
			if(interaction.client.games[`${interaction.user.id}`])
			{
				interaction.client.interactions[`${interaction.user.id}`].deleteReply();
				delete interaction.client.games[`${interaction.user.id}`];
				return;
			}
			else
			{
				return interaction.reply("You have no active game to end");
			}
		}
		else if(action == "getFEN")
		{
			if(interaction.client.games[`${interaction.user.id}`])
			{
				return interaction.reply(interaction.client.games[`${interaction.user.id}`]);
			}
			else
			{
				return interaction.reply("You have no active game from which to obtain a FEN string");
			}
		}
	},
	exiter: (client)=>{
		
	}
};
