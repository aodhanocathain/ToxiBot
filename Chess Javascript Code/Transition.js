class Transition
{
	before;
	after;
	
	constructor(before, after)
	{
		this.before = before;
		this.after = after;
	}
	
	toString()
	{
		return `${this.before.toString()}->${this.after.toString()}`
	}
}

module.exports = {
	Transition:Transition
};