const {asciiOffset, mask} = require("./Helpers.js");
const {MIN_FILE, MIN_RANK, NUM_FILES, NUM_RANKS} = require("./Constants.js");

const NUM_FILE_BITS = Math.ceil(Math.log2(NUM_FILES));

const FILE_BITS_MASK = mask(NUM_FILE_BITS);

//represent a square using a single integer
//[rank bits][file bits]
class Square
{
	static make(rank,file)
	{
		return (rank << NUM_FILE_BITS) | file;
	}
	
	static validRankAndFile(rank,file)
	{
		return (0 <= rank) && (rank < NUM_RANKS) && (0 <= file) && (file < NUM_FILES);
	}
	
	static rank(square)
	{
		return square >> NUM_FILE_BITS;
	}
	
	static file(square)
	{
		return square & FILE_BITS_MASK;
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