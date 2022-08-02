const fs = require("fs");
const util = require("util");
const guard = require("../resources/guard.js");

const cmd = "help";

module.exports = {
    name: cmd,
    description: "List the available commands",
	args: [],
	arginfo: [],
    execute(message, args)
    {
		guard.add(args, guard.ARG_COUNT, 0);
		
        let speech = "";
        const commands = fs.readdirSync(__dirname);
        for(const file of commands)
        {
            const commandInfo = require(`${__dirname}/${file}`);
            speech = util.format("%s**%s**:\t%s\n", speech, commandInfo.name, commandInfo.description);
        }
		speech = util.format("%s**shutdown**:\t Shut down the bot\n", speech);
		speech = util.format(">>> %s", speech);
		message.channel.send(speech);
		message.channel.send(`Learn more about a command by typing '__${process.env.PREFIX} **commandName**__'`);
    }
};