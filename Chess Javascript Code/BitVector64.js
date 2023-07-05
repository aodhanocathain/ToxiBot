class BitVector64
{
	//built specifically for 64 bits with the assumption of 32-bit integers in javascript
	
	words;	//integers
	
	constructor()
	{
		this.words = [0,0];
	}
	
	set(index64)
	{
		const wordIndex = (index64 >> 5) & 1;
		const index32 = index64 & 31;
		this.words[wordIndex] |= (1 << index32);
	}
	
	clear(index64)
	{
		const wordIndex = (index64 >> 5) & 1;
		const index32 = index64 & 31;
		this.words[wordIndex] &= ~(1 << index32);
	}
	
	or(otherVector)
	{
		this.words[0] |= otherVector.words[0];
		this.words[1] |= otherVector.words[1];
	}
	
	read(index64)
	{
		const wordIndex = (index64 >> 5) & 1;
		const index32 = index64 & 31;
		return (this.words[wordIndex] >> index32) & 1;
	}
	
	toString()
	{
		let str = ``;
		for(let rank=7; rank>=0; rank--)
		{
			for(let file=0; file<8; file++)
			{
				str = str.concat(` ${this.read(BitVector64.indexify(rank,file))}`);
			}
			str = str.concat("\n");
		}
		return str;
	}
}

module.exports = {
	BitVector64: BitVector64
};