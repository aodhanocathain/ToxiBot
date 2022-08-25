const {inspect} = require("util");

class arg
{
	constructor(name, summary)
	{
		this.name = name;
		this.summary = summary;
	};
};

class enumarg extends arg
{
	constructor(name, summary, options)	//currently, options is a mapping of keywords to arg-summary pairs
	{
		super(name, summary);
		this.options = options;
	}
	
	verify(choice)
	{
		const names = this.options.map(item => item.name)
		return (names.includes(choice));
	}
	
	next(choice)
	{
		for(let i=0; i<this.options.length; i++)
		{
			if(this.options[i].name==choice)
			{
				return this.options[i].arg;
			}
		}
	}
};

class rangearg extends arg
{
	constructor(name, summary, extras)
	{
		super(name, summary);
		const keys = Object.keys(extras);
		if(extras)
		{
			if(keys.includes("verify")){this.verify = extras["verify"];}
			if(keys.includes("next")){this.next = extras["next"];}
			if(keys.includes("act")){this.act = extras["act"];}
		}
	}
};

class opt
{
	constructor(name, summary, extras)
	{
		this.name = name;
		this.summary = summary;
		if(extras)
		{
			const keys = Object.keys(extras);
			if(keys.includes("arg")){this.arg = extras["arg"];}
			if(keys.includes("act")){this.act = extras["act"];}
		}
	}
};

module.exports = 
{
	Arg: arg,
	
	EnumArg: enumarg,
	
	RangeArg: rangearg,
	
	Option: opt
}