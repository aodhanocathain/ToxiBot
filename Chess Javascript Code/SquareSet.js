const {BitVector64} = require("./BitVector64.js");

class SquareSet
{
	bitvector;
	constructor()
	{
		this.bitvector = new BitVector64();
	}
	
	clone()
	{
		const clone = new SquareSet();
		clone.bitvector = this.bitvector.clone();
		return clone;
	}

	add(square)
	{
		this.bitvector.set(square);
	}

	remove(square)
	{
		this.bitvector.clear(square);
	}

	union(squareSet)
	{
		this.bitvector.or(squareSet.bitvector);
	}
	
	difference(squareSet)
	{
		const mask = squareSet.bitvector.clone();
		mask.invert();
		this.bitvector.and(mask);
	}

	intersection(squareSet)
	{
		this.bitvector.and(squareSet.bitvector);
	}

	has(square)
	{
		return this.bitvector.read(square);
	}

	isEmpty()
	{
		return this.bitvector.isEmpty();
	}

	squares()
	{
		return Array.from(this);
	}

	[Symbol.iterator](){
		const bits = this.bitvector;
		let prevIndex = -1;
		return {
			next: function(){
				let nextIndex = prevIndex+1;
				while(nextIndex<64 && bits.read(nextIndex)!=1)
				{
					nextIndex++;
				}
				prevIndex = nextIndex;
				return {
					done: (nextIndex==64),
					value: nextIndex
				}
			}
		}
	}
}

module.exports = {
    SquareSet: SquareSet
};