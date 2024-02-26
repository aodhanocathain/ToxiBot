const {BitVector64} = require("./BitVector64.js");
const {MIN_FILE, MIN_RANK, NUM_FILES, NUM_RANKS} = require("./Constants.js");
const {asciiOffset, intsUpTo} = require("./Helpers.js");

//represent a square as a single integer
class Square
{
	static withRankAndFile(rank,file)
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
	
	static distance(square1, square2)
	{
		const fileDistance = Square.file(square1) - Square.file(square2);
		const rankDistance = Square.rank(square1) - Square.rank(square2);
		return Math.sqrt((fileDistance*fileDistance)+(rankDistance*rankDistance));
	}

	static increasingFullArray()
	{
		return intsUpTo(NUM_RANKS*NUM_FILES);
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

class SquareList
{
	bits;
	constructor()
	{
		this.bits = new BitVector64();
	}

	add(square)
	{
		this.bits.set(square);
	}

	remove(square)
	{
		this.bits.clear(square);
	}

	[Symbol.iterator](){
		const bits = this.bits;
		return {
			next: function(){
				const nextSquare = bits.popLSB();
				return {
					done: (nextSquare==64),
					value: nextSquare
				}
			}
		}
	}
}

module.exports = {
	Square:Square,
	SquareList:SquareList
};