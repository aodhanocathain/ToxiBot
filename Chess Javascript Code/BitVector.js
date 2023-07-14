const {mask} = require("./Helpers.js");

const WORD_WIDTH = 32;	//assuming 32-bit integers in javascript
const BIT_INDEX_WIDTH = Math.ceil(Math.log2(WORD_WIDTH));
const BIT_INDEX_MASK = mask(BIT_INDEX_WIDTH);

//store bits using integers, assuming 32 bit integers in javascript
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
	BitVector: BitVector
};