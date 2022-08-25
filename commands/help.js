const cmd = "help";

const fs = require("fs");

module.exports = {
    name: cmd,
    summary: "List the available commands",
	arg: undefined,
	
    execute(message, args)
    {
        let helpmsg = `>>> `;
        const commands = fs.readdirSync(__dirname);
		//list each available command and explain its effect
        for(const file of commands)
        {
            const commandInfo = require(`${__dirname}/${file}`);
			helpmsg = `${helpmsg}\`${commandInfo.name}\`:\t${commandInfo.summary}\n`;
        }
		let placeholder = "{name}";
		helpmsg = `${helpmsg}Learn about a command using '**${process.env.PREFIX} ${placeholder}**', replacing **${placeholder}** with your command of choice.`;
		message.channel.send(helpmsg);
    }
};