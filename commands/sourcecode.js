const cmd = "sourcecode";

module.exports = {
    name: cmd,
    summary: "Access the bot's code",
	arg: undefined,
	
    execute(message, args)
    {
		message.channel.send("https://github.com/aodhanocathain/ToxiBot");
    }
};