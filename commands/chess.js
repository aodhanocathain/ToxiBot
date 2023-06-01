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
	{name: "gameend", value:"gameend"},
	{name: "getFEN", value:"getFEN"}
	);
}

const commandName = "chess";

function interactionReplyFromMove(interaction, move)
{
	const game = Chess.FENStringToGame(interaction.client.FENs[`${interaction.user.id}`]);
	if(move)
	{
		Chess.MakeMoveInGame(move, game);
		interaction.client.FENs[`${interaction.user.id}`] = Chess.GameToFENString(game);
	}
	const buffer = Chess.FENStringToPNGBuffer(interaction.client.FENs[`${interaction.user.id}`]);
	let moveList = Chess.KingLegalsInGame(game);
	let moveSelectMenu = new Discord.StringSelectMenuBuilder().setCustomId("move").setPlaceholder("Choose a move")
	.addOptions(
		...moveList.map((move)=>{
			return new Discord.StringSelectMenuOptionBuilder().setLabel(move).setValue(move)
		})
	)
	
	return buffer.then((b)=>{
		return {
			content: interaction.client.FENs[`${interaction.user.id}`],
			files: [b],
			components: [new Discord.ActionRowBuilder().addComponents(moveSelectMenu)]
		}
	});
}

module.exports = {
	name: commandName,
	configure: (client) => {
		client.FENs = {};
	},
	discordCommand : new Discord.SlashCommandBuilder().setName(commandName).setDescription("Utilize chess functionality")
	.addStringOption(actionOption),
	execute: (interaction) => {
		const action = interaction.options.getString("action");
		if(action == "gamecreate")
		{
			if(interaction.client.FENs[`${interaction.user.id}`])
			{
				return interaction.reply("You already have an active game");
			}
			interaction.client.FENs[`${interaction.user.id}`] = Chess.DEFAULT_FEN_STRING;
			
			return Promise.all([interactionReplyFromMove(interaction, null)])
			.then(([message])=>{
				return interaction.reply(message)
				.then((response)=>{
					const collector = response.createMessageComponentCollector();
					collector.on("collect", (selection)=>{
						const [move] = selection.values;
						Promise.all([interactionReplyFromMove(interaction, move)])
						.then(([message])=>{
							selection.update(message);
						});
					});
				});
			});
		}
		else if(action == "gameend")
		{
			if(interaction.client.FENs[`${interaction.user.id}`])
			{
				interaction.client.interactions[`${interaction.user.id}`].deleteReply();
				delete interaction.client.FENs[`${interaction.user.id}`];
				return;
			}
			else
			{
				return interaction.reply("You have no active game to end");
			}
		}
		else if(action == "getFEN")
		{
			if(interaction.client.FENs[`${interaction.user.id}`])
			{
				return interaction.reply(interaction.client.FENs[`${interaction.user.id}`]);
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
