const remarks = require("../resources/remarks.js").remarks
const util = require("util");
const guard = require('../resources/guard.js');

const cmd = "toxic";

module.exports = {
    name: cmd,
    description: "Useless test command to say something mean",
	args: ["index"],
	arginfo: [`Integer with minimum value of 0 and maximum value of ${remarks.length-1}`],
    execute(message, choices)
    {
		guard.add(choices, guard.ARG_COUNT, 1);
		
		const index = +choices[0]
		guard.addAll(index, remarks.length-1);
		
		message.channel.send(remarks[index]);
    },
};