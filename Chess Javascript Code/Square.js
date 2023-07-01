const {MIN_FILE, MIN_RANK, NUM_FILES, NUM_RANKS} = require("./Constants.js");
const {asciiOffset} = require("./Helpers.js");

class Square
{
	rank;
	file;
	
	game;
	piece;
	
	constructor(rank, file, game)
	{
		this.rank = rank;
		this.file = file;
		this.game = game;
		
		this.piece = null;
	}
	
	offset(rankOffset, fileOffset)
	{
		const newRank = this.rank+rankOffset;
		const newFile = this.file+fileOffset;
		if(0<=newFile && 0<=newRank && newFile<NUM_FILES && newRank<NUM_RANKS)
		{
			return this.game.squares[newRank][newFile];
		}
	}
	
	rankString()
	{
		return asciiOffset(MIN_RANK, this.rank);
	}
	
	fileString()
	{
		return asciiOffset(MIN_FILE, this.file);
	}
	
	toString()
	{
		return `${this.fileString()}${this.rankString()}`;
	}
}

module.exports = {
	Square:Square
}