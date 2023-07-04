class Manager
{
	cache;
	item;
	
	constructor()
	{
		this.cache = [];
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
	
	get()
	{
		return this.item;
	}
}

module.exports = {
	Manager:Manager
};