const zombies = require("../resources/zombies.js");
const util = require("util");

const cmd = "fnfal";

module.exports = {
    name: cmd,
    summary: "COD zombies random picker",
	arg: 
	{
		name: "selection",
		explanation: "the aspect of zombies you want to randomly pick",
		options:
		{
			"game":
			{
				summary: "pick a random zombies game",
			},
			"map":
			{
				summary: "pick a random zombies map",
			},
		}
	},
    execute(message, choices)
    {
		const possibilities = zombies[choices[0]];
		let index = Math.floor(Math.random()*possibilities.length);
		message.channel.send(possibilities[index]);
    }
};