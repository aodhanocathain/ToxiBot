//store bits using an array of integers, assuming 32 bit integers in javascript
//index a bit as [which integer][which bit in the integer]
//e.g. bit 0 is [0][0]
//bit 32 is [1][0]
//bit 33 is [1][1]

const {countTrailingZeroesInBits} = require("./Helpers.js")

const WORD_WIDTH = 32;	//assuming 32-bit integers in javascript
class BitVector64
{
	words;	//the integers that hold the bits
	
	constructor()
	{
		this.words = [0,0];
	}
	
	clone()
	{
		const clone = new BitVector64();
		for(let i=0; i<this.words.length; i++)
		{
			clone.words[i] = this.words[i];
		}
		return clone;
	}
	
	set(index)
	{
		const wordIndex = Math.floor(index / WORD_WIDTH);
		const bitIndex = index % WORD_WIDTH;	//the bit's index within the chosen word
		this.words[wordIndex] |= (1 << bitIndex);
		return this;
	}
	
	clear(index)
	{
		const wordIndex = Math.floor(index / WORD_WIDTH);
		const bitIndex = index % WORD_WIDTH;	//the bit's index within the chosen word
		this.words[wordIndex] &= ~(1 << bitIndex);
		return this;
	}
	
	read(index)
	{
		const wordIndex = Math.floor(index / WORD_WIDTH);
		const bitIndex = index % WORD_WIDTH;	//the bit's index within the chosen word
		return (this.words[wordIndex] >> bitIndex) & 1;
	}
	
	write(value, index)
	{
		const wordIndex = Math.floor(index / WORD_WIDTH);
		const bitIndex = index % WORD_WIDTH;	//the bit's index within the chosen word
		this.words[wordIndex] &= ~(1 << bitIndex);	//erase what was there (write a 0 by default)
		this.words[wordIndex] |= (value << bitIndex);	//write the new value (write a 1 if necessary)
		return this;
	}
	
	or(otherVector)
	{
		otherVector.words.forEach((word,index)=>{this.words[index]|=word});
	}
	
	and(otherVector)
	{
		otherVector.words.forEach((word,index)=>{this.words[index]&=word});
	}
	
	isEmpty()
	{
		return (this.words[0] | this.words[1]) == 0;
	}

	countTrailingZeroes()
	{
		const firstWordCount = countTrailingZeroesInBits(this.words[0]);
		if(firstWordCount<32){return firstWordCount};
		return firstWordCount + countTrailingZeroesInBits(this.words[1]);
	}

	popLSB()
	{
		const index = this.countTrailingZeroes();
		this.clear(index);
		return index;
	}
	
	toString()
	{
		//least significant bit shows on the left
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
	BitVector64: BitVector64
};