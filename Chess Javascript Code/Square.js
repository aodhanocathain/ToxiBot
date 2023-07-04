const {asciiOffset} = require("./Helpers.js");
const {MIN_FILE, MIN_RANK} = require("./Constants.js");

class Square	//assumes 8 ranks and 8 files
{
	static make(rank,file)
	{
		return (rank<<3)|file;
	}
	
	static rank(square)
	{
		return square >> 3;
	}
	
	static file(square)
	{
		return square & 7;
	}
	
	static rankString(square)
	{
		return asciiOffset(MIN_RANK, this.rank(square));
	}
	
	static fileString(square)
	{
		return asciiOffset(MIN_FILE, this.file(square));
	}
	
	static fullString(square)
	{
		return `${this.fileString(square)}${this.rankString(square)}`;
	}
}

module.exports = {
	Square:Square
};