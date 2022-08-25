const zombies = require("../resources/zombies.js");
const util = require("util");
const {EnumArg, Option} = require("../utilities/args.js");
const cmd = "fnfal";

function act(pick, index)
{
	message.channel.send(zombies[pick][index]);
}

module.exports = {
    name: cmd,
    summary: "COD zombies random picker",
	arg: new EnumArg("selection", "the aspect of zombies you want to randomly pick", [
		new Option("game", "pick a random zombies game"),
		new Option("map", "pick a random zombies map"),
	]),
    execute(message, choices)
    {
		const possibilities = zombies[choices[0]];
		let index = Math.floor(Math.random()*possibilities.length);
		message.channel.send(possibilities[index]);
    }
};