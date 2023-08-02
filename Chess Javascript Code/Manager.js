//store data that will be needed later, so that instead of recalculating later, can access stored version
//useful for undoing moves in chess games, can revert back to old settings instead of updating them from scratch
class Manager
{
	cache;
	item;
	
	constructor(initialItem)
	{
		this.cache = [];
		this.item = initialItem;
	}
	
	update(newItem)
	{
		this.cache.push(this.item);
		this.item = newItem;
	}
	
	revert()
	{
		this.item = this.cache.pop();
	}
	
	pop()
	{
		const item = this.item;
		this.revert();
		return item;
	}
	
	get()
	{
		return this.item;
	}
}

module.exports = {
	Manager:Manager
};