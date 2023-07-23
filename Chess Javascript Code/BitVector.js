const {generateMask} = require("./Helpers.js");

//store bits using an array of integers, assuming 32 bit integers in javascript
//index a bit as [which integer][which bit in the integer]
//e.g. bit 0 is [0][0]
//bit 32 is [1][0]
//bit 33 is [1][1]

const WORD_WIDTH = 32;	//assuming 32-bit integers in javascript
const BIT_INDEX_WIDTH = Math.ceil(Math.log2(WORD_WIDTH));
const BIT_INDEX_MASK = generateMask(BIT_INDEX_WIDTH);
class BitVector
{
	static INTERACTION_NAMES = ["set","clear","read"];
	static SET = this.INTERACTION_NAMES.indexOf("set");
	static CLEAR = this.INTERACTION_NAMES.indexOf("clear");
	static READ = this.INTERACTION_NAMES.indexOf("read");

	words;	//the integers that hold the bits
	
	constructor(numBits)
	{
		this.words = [];
	}
	
	interact(interactionIndex, index)
	{
		const wordIndex = index >> BIT_INDEX_WIDTH;
		const bitIndex = index & BIT_INDEX_MASK;
		const funcName = this.constructor.INTERACTION_NAMES[interactionIndex];
		return this[funcName](wordIndex, bitIndex);
	}
	
	set(wordIndex, bitIndex)
	{
		this.words[wordIndex] |= (1 << bitIndex);
	}
	
	clear(wordIndex, bitIndex)
	{
		this.words[wordIndex] &= ~(1 << bitIndex);
	}
	
	read(wordIndex, bitIndex)
	{
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
				str = `${str}${this.read(w,i)}`;
			}
			str = str.concat("\t");
		}
		return str;
	}
}

module.exports = {
	BitVector: BitVector
};