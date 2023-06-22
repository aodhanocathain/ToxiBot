const {NUM_FILES, NUM_RANKS, MIN_FILE, MIN_RANK} = require("./Constants.js");
const {asciiOffset} = require("./Helpers.js");

class Square
{
	rank;
	file;
	
	rankString;
	fileString;
	
	valid;
	
	constructor(rank, file)
	{
		this.rank = rank;
		this.file = file;
		
		this.valid = (0 <= this.rank) && (this.rank < NUM_RANKS) && (0 <= this.file) && (this.file < NUM_FILES);
		
		if(this.valid)
		{
			this.rankString = asciiOffset(MIN_RANK, this.rank);
			this.fileString = asciiOffset(MIN_FILE, this.file);
		}
	}
	
	offset(offset)
	{
		return new Square(this.rank+offset.rank, this.file+offset.file);
	}
	
	sameAs(square)
	{
		return (this.rank==square.rank) && (this.file==square.file);
	}
	
	toString()
	{
		return `${this.fileString}${this.rankString}`;
	}
}

module.exports = {
	Square:Square
}