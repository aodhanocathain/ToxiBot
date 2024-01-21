//store bits using an array of integers, assuming 32 bit integers in javascript
//index a bit as [which integer][which bit in the integer]
//e.g. bit 0 is [0][0]
//bit 32 is [1][0]
//bit 33 is [1][1]

const WORD_WIDTH = 32;	//assuming 32-bit integers in javascript
class BitVector
{
	words;	//the integers that hold the bits
	
	constructor(numBits)
	{
		this.words = [];
	}
	
	set(index)
	{
		const wordIndex = Math.floor(index / WORD_WIDTH);
		const bitIndex = index % WORD_WIDTH;	//the bit's index within the chosen word
		this.words[wordIndex] |= (1 << bitIndex);
	}
	
	clear(index)
	{
		const wordIndex = Math.floor(index / WORD_WIDTH);
		const bitIndex = index % WORD_WIDTH;	//the bit's index within the chosen word
		this.words[wordIndex] &= ~(1 << bitIndex);
	}
	
	read(index)
	{
		const wordIndex = Math.floor(index / WORD_WIDTH);
		const bitIndex = index % WORD_WIDTH;	//the bit's index within the chosen word
		return (this.words[wordIndex] >> bitIndex) & 1;
	}
	
	or(otherVector)
	{
		otherVector.words.forEach((word,index)=>{this.words[index]|=word});
	}
	
	toString()
	{
		let str = ``;
		for(let w=0; w<this.words.length; w++)
		{
			for(let i=0; i<WORD_WIDTH; i++)
			{
				str = `${str}${this.read((w*WORD_WIDTH)+i)}`;
			}
			str = str.concat("\t");
		}
		return str;
	}
}

module.exports = {
	BitVector: BitVector
};