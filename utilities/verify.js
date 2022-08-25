const {EnumArg} = require("./args.js");

function explain(options)	//explain each of the possible options
{
	let string = ``;
	for(const opt of options)
	{
		string = `${string}\`${opt.name}\`:\t${opt.summary}\n`;
	}
	return string;
}

module.exports =
{
	verify: function(message, choices, properties)
	{
		let i; let arg; let lastarg;
		try
		{
			if(!properties){throw process.env.UNSUPPORTED_CMD_ERROR;}	//main.js fails to "require" the properties of a nonexistant command
			arg = properties.arg; i = 0;
			while(i<choices.length)	//step through the user's choice of arguments making sure each is allowed
			{
				const choice = choices[i];
				if(!arg){throw process.env.MANY_ARGS_ERROR;}	//No more expected arguments, yet more were provided
				if(arg.verify(choice)==true){lastarg = arg; arg = arg.next(choice); i++;}
				else{throw process.env.INVALID_ARGS_ERROR;}	//No option matching the next argument the user provided
			}
			if(arg){throw process.env.FEW_ARGS_ERROR;}	//Requires more arguments to precisely determine the user's intention, lacking remaining arguments to do so
			return lastarg;
		}
		catch(err)
		{
			let msg;
			if(err.includes(process.env.UNSUPPORTED_CMD_ERROR))
			{
				msg = `unsupported command\n> ${message}\nTry **'tbot help'** to see available commands\n`;
			}
			else if(err.includes(process.env.MANY_ARGS_ERROR))
			{
				msg = `too many arguments supplied.\n> ${process.env.PREFIX} ${properties.name}`;
				for(let allowed = 0; allowed < i; allowed++)
				{
					msg = `${msg} ${choices[allowed]}`;	//show allowed arguments normally
				}
				
				for(let excessive = i; excessive < choices.length; excessive++)
				{
					msg = `${msg} **__${choices[excessive]}__**`;	//highlight and append excessive arguments
				}
				msg = `${msg}\nUnderlined bold arguments above are redundant.\n`;
			}
			else
			{
				//Point out the flawed or missing argument and show the possible options
				let help = (arg instanceof EnumArg? explain(arg.options) : `\`${arg.name}\`:\t${arg.summary}\n`);
				if(err.includes(process.env.FEW_ARGS_ERROR))
				{
					msg = `missing \`${arg.name}\` argument (${arg.summary}).`;
					msg = `${msg}\n> ${message.content} **__???__**`
				}
				else if(err.includes(process.env.INVALID_ARGS_ERROR))
				{
					msg = `invalid argument applied.\n> ${process.env.PREFIX} ${properties.name}`;
					for(let valid = 0; valid < i; valid++)
					{
						msg = `${msg} ${choices[valid]}`;
					}
					msg = `${msg} **__${choices[i]}__**`;
					msg = `${msg}\nInvalid argument shown underlined in bold above.`;
				}
				msg = `${msg}\nConsult the below help and try again.\n${help}`;
			}
			return `${msg}Note: If keywords are separated by more than 1 space then the command will fail`;
		}
	}	
}