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
	);
}

const commandName = "chess";

function interactionReplyFromMove(interaction, move)
{
	//apply the move in the user's game and return the necessary update to the original reply
	
	const game = Chess.FENStringToGame(interaction.client.FENs[`${interaction.user.id}`]);
	if(move)
	{
		Chess.MakeMoveInGame(move, game);
		interaction.client.FENs[`${interaction.user.id}`] = Chess.GameToFENString(game);
	}
	//image of the board
	const buffer = Chess.FENStringToPNGBuffer(interaction.client.FENs[`${interaction.user.id}`]);
	let moveList = Chess.AllLegalsInGame(game);
	console.log(moveList);
	moveList = Array.from(new Set(moveList));
	let moveSelectMenu = new Discord.StringSelectMenuBuilder().setCustomId("move").setPlaceholder("Choose a move")
	.addOptions(
		...moveList.map((move)=>{
			return new Discord.StringSelectMenuOptionBuilder().setLabel(move).setValue(move)
		})
	)
	
	const moveHistory = interaction.client.histories[`${interaction.user.id}`].join(" ");
	const FENString = interaction.client.FENs[`${interaction.user.id}`];
	
	return buffer.then((b)=>{
		return {
			content: `Moves: ${moveHistory}\nFEN String: ${FENString}`,
			files: [b],
			components: [new Discord.ActionRowBuilder().addComponents(moveSelectMenu)]
		}
	});
}

module.exports = {
	name: commandName,
	configure: (client) => {
		client.FENs = {};
		client.interactions = {};
		client.histories = {};
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
			interaction.client.interactions[`${interaction.user.id}`] = interaction;
			interaction.client.histories[`${interaction.user.id}`] = [];
			
			return Promise.all([interactionReplyFromMove(interaction, null)])
			.then(([message])=>{
				//reply with an interactive message that collects responses and updates the board
				return interaction.reply(message)
				.then((response)=>{
					const collector = response.createMessageComponentCollector();
					collector.on("collect", (selection)=>{
						//only respond to the active game, not to previously ended games
						if(selection.message.interaction.id == (interaction.client.interactions[`${interaction.user.id}`]??{id:null}).id)
						{
							const [move] = selection.values;
							interaction.client.histories[`${interaction.user.id}`].push(move);
							Promise.all([interactionReplyFromMove(interaction, move)])
							.then(([message])=>{
								selection.update(message);
							});
						}
					});
				});
			});
		}
		else if(action == "gameend")
		{
			if(interaction.client.FENs[`${interaction.user.id}`])
			{
				delete interaction.client.interactions[`${interaction.user.id}`];
				delete interaction.client.FENs[`${interaction.user.id}`];
				delete interaction.client.histories[`${interaction.user.id}`];
				return;
			}
			else
			{
				return interaction.reply("You have no active game to end");
			}
		}
	},
	exiter: (client)=>{
		
	}
};
