const ARG_COUNT = 0;
const ARG_EXISTS = 1;
const ARG_IS_INT = 2;
const ARG_RANGE = 3;

module.exports = 
{
	ARG_COUNT: 0,
	ARG_EXISTS : 1,
	ARG_IS_INT : 2,
	ARG_RANGE : 3,
	checks: [
		function argcount(args, amount)
		{
			if(args.length<amount){throw process.env.FEW_ARGS_ERROR;}
			if(args.length>amount){throw process.env.MANY_ARGS_ERROR;}
		},
		function argexists(arg)
		{
			if(arg!=0){if(!arg){throw process.env.INVALID_ARGS_ERROR;}}
		},
		function argisint(arg)
		{
			if(!Number.isInteger(arg)){throw process.env.INVALID_ARGS_ERROR;}
		},
		function argrange(arg, range)
		{
			if(arg<0 || arg>range){throw process.env.INVALID_ARGS_ERROR;}
		}
	],
	add(arg, clause, detail)
	{
		this.checks[clause](arg, detail);
	},
	addAll(arg, max)
	{
		for(let i=1; i<this.checks.length; i++)
		{
			this.checks[i](arg, max);
		}
	}
}