const {asciiOffset} = require("./Helpers.js");
const {MIN_FILE, MIN_RANK, NUM_FILES, NUM_RANKS} = require("./Constants.js");

//represent a square as a single integer
class Square
{
	static make(rank,file)
	{
		return (rank*NUM_FILES) + file;
	}
	
	static validRank(rank)
	{
		return (0 <= rank) && (rank < NUM_RANKS);
	}
	
	static validFile(file)
	{
		return (0 <= file) && (file < NUM_FILES);
	}
	
	static validRankAndFile(rank,file)
	{
		return this.validRank(rank) && this.validFile(file);
	}
	
	static rank(square)
	{
		return Math.floor(square / NUM_FILES);
	}
	
	static file(square)
	{
		return square % NUM_FILES;
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