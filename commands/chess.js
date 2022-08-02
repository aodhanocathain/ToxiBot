const guard = require("../resources/guard.js");

const cmd = "chess";

module.exports = {
    name: cmd,
    description: "Make use of chess functionality",
	args: [],
	arginfo: [],
    execute(message, args)
    {
		message.channel.send("Coming soon :^)");
	}
};