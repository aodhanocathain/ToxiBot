const Discord = require("discord.js");

const gameCommand = (command) => {
	return command
	.setName("game")
	.setDescription("pick a random game");
};

const mapCommand = (command) => {
	return command
	.setName("map")
	.setDescription("pick a random map")
}

const expCommand = (command) => {
	return command
	.setName("experience")
	.setDescription("pick a random map and one of its modes");
};

const ZombiesGames = {
	"World at War": [
		{map:"Nacht der Untoten", modes:["survival"]},
		{map:"Zombie Verrückt", modes:["survival"]},
		{map:"Shi No Numa", modes:["survival"]},
		{map:"Der Riese", modes:["survival"]}
	],
	"Black Ops 1": [
		{map:"Kino der Toten", modes:["survival"]},
		{map:"\"Five\"", modes:["survival"]},
		{map:"Dead Ops Arcade", modes:["survival"]},
		{map:"Ascension", modes:["survival"]},
		{map:"Call of the Dead", modes:["survival"]},
		{map:"Shangri-La", modes:["survival"]},
		{map:"Moon", modes:["survival"]},
	],
	"Black Ops 2": [
		{map:"Bus Depot", modes:["survival"]},
		{map:"Farm", modes:["survival", "grief"]},
		{map:"Diner", modes:["turned"]},
		{map:"Town", modes:["survival", "grief"]},
		{map:"Tranzit", modes:["survival"]},
		{map:"Nuketown Zombies", modes:["survival"]},
		{map:"Die Rise", modes:["survival"]},
		{map:"Mob of the Dead", modes:["survival", "grief"]},
		{map:"Buried", modes:["survival", "turned"]},
		{map:"Origins", modes:["survival"]}
	],
	"Black Ops 3": [
		{map:"Shadows of Evil", modes:["survival"]},
		{map:"The Giant", modes:["survival"]},
		{map:"Dead Ops Arcade", modes:["survival"]},
		{map:"Der Eisendrache", modes:["survival"]},
		{map:"Zetsubou no Shima", modes:["survival"]},
		{map:"Gorod Krovi", modes:["survival"]},
		{map:"Revelations", modes:["survival"]},
	],
	"Black Ops 4": [
		{map:"Voyage of Despair", modes:["survival"]},
		{map:"IX", modes:["survival"]},
		{map:"Blood of the Dead", modes:["survival"]},
		{map:"Classified", modes:["survival"]},
		{map:"Dead of the Night", modes:["survival"]},
		{map:"Ancient Evil", modes:["survival"]},
		{map:"Alpha Omega", modes:["survival"]},
		{map:"Tag Der Toten", modes:["survival"]},
	],
};

const items = Object.values(ZombiesGames).flat(1);

const pickRandomArrayElement = (array) => {
	return array[Math.floor(Math.random()*array.length)]
};

module.exports = {
	name: "fnfal",
	discordCommand : new Discord.SlashCommandBuilder().setName("fnfal").setDescription("randomly pick COD zombies")
	.addSubcommand(gameCommand)
	.addSubcommand(mapCommand)
	.addSubcommand(expCommand),
	execute: (interaction) => {
		const subcommand = interaction.options.getSubcommand();
		if(subcommand=="game")
		{
			interaction.reply(pickRandomArrayElement(Object.keys(ZombiesGames)));
		}
		else if(subcommand=="map")
		{
			interaction.reply(pickRandomArrayElement(items.map((item)=>{return item.map;})));
		}
		else if(subcommand=="experience")
		{
			const item = pickRandomArrayElement(items);
			const mode = pickRandomArrayElement(item.modes);
			interaction.reply(`${item.map} (${mode})`);
		}
	}
};
