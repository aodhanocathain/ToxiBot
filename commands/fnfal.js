const zombies = require("../resources/zombies.js");
const util = require("util");
const guard = require("../resources/guard.js");

const cmd = "fnfal";

module.exports = {
    name: cmd,
    description: "COD zombies random picker",
	args: ["type"],
	arginfo: [["game","map"]],
    execute(message, choices)
    {
		guard.add(choices, guard.ARG_COUNT, 1);
		
		guard.add(choices, guard.ARG_EXISTS);
		
		let index, list;
		switch(choices[0])
		{
			case this.arginfo[0][0]:
			index = Math.floor(Math.random()*zombies.games.length);
			list = zombies.games;
			break;
			case this.arginfo[0][1]:
			index = Math.floor(Math.random()*zombies.maps.length);
			list = zombies.maps;
			break;
			default:
			throw process.env.INVALID_ARGS_ERROR;
			break;
		}
		message.channel.send(list[index]);
    }
};