const remarks = require("../utilities/remark.js");
const {RangeArg} = require("../utilities/args.js");

const cmd = "toxic";

module.exports = {
    name: cmd,
    summary: "Useless test command to say something mean",
	arg: new RangeArg("index", `Integer with min value 0 and max value ${remarks.length()-1}`,
	{
		verify: (choice)=>
		{
			const num = +choice;
			if(Number.isInteger(num)){if(num>=0 && num<remarks.length()){return true;}}
			return false;
		},
		next: ()=>{return undefined;}
	}),
    execute(message, choices)
    {
		remarks.make(message.channel, +choices[0]);
    },
};