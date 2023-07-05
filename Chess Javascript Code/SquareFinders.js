const {Square} = require("./Square.js");
const {BitVector64} = require("./BitVector64.js");

//for patterns that depend only on set offsets from a starting square
function squaresAndBitsInPatternFromSquareInGame(pattern,square,game)
{
	const squaresArray = [];
	const squaresBits = new BitVector64();
	
	const rank = Square.rank(square);
	const file = Square.file(square);
	
	for(let i=0; i<pattern.length; i+=2)
	{
		const newRank = rank + pattern[i];
		const newFile = file + pattern[i+1];
		//if it is in the board, include it
		if(((newRank|newFile)>>3)==0)
		{
			const newSquare = Square.make(newRank,newFile);
			squaresArray.push(newSquare);
			squaresBits.set(newSquare);
		}
	}
	
	return [squaresArray, squaresBits];
}

function squaresInPatternFromSquareInGame(pattern,square,game)
{
	const squaresArray = [];
	
	const rank = Square.rank(square);
	const file = Square.file(square);
	
	for(let i=0; i<pattern.length; i+=2)
	{
		const newRank = rank + pattern[i];
		const newFile = file + pattern[i+1];
		//if it is in the board, include it
		if(((newRank|newFile)>>3)==0)
		{
			squaresArray.push(Square.make(newRank,newFile));
		}
	}
	
	return squaresArray;
}

function bitsInPatternFromSquareInGame(pattern,square,game)
{
	const squaresBits = new BitVector64();
	
	const rank = Square.rank(square);
	const file = Square.file(square);
	
	for(let i=0; i<pattern.length; i+=2)
	{
		const newRank = rank + pattern[i];
		const newFile = file + pattern[i+1];
		//if it is in the board, include it
		if(((newRank|newFile)>>3)==0)
		{
			squaresBits.set(Square.make(newRank,newFile));
		}
	}
	
	return squaresBits;
}

//for patterns that extend as far as possible in directions from a starting square
function squaresAndBitsInDirectionsFromSquareInGame(directions,square,game)
{
	const squaresArray = [];
	const squaresBits = new BitVector64();
	
	const squaresOccupiedBitVector = game.squaresOccupiedBitVector;
	
	const rank = Square.rank(square);
	const file = Square.file(square);
	
	for(let i=0; i<directions.length; i+=2)
	{
		const rankOffset = directions[i];
		const fileOffset = directions[i+1];
		
		let newRank = rank+rankOffset;
		let newFile = file+fileOffset;
		let blocked = false;
		
		while((((newRank|newFile)>>3)==0) && !blocked)
		{
			const newSquare = Square.make(newRank,newFile);
			
			squaresArray.push(newSquare);
			squaresBits.set(newSquare);
			
			blocked = squaresOccupiedBitVector.read(newSquare);
			newRank += rankOffset;
			newFile += fileOffset;
		}
	}
	return [squaresArray,squaresBits];
}

function squaresInDirectionsFromSquareInGame(directions,square,game)
{
	const squaresArray = [];
	
	const squaresOccupiedBitVector = game.squaresOccupiedBitVector;
	
	const rank = Square.rank(square);
	const file = Square.file(square);
	
	for(let i=0; i<directions.length; i+=2)
	{
		const rankOffset = directions[i];
		const fileOffset = directions[i+1];
		
		let newRank = rank+rankOffset;
		let newFile = file+fileOffset;
		let blocked = false;
		
		while((((newRank|newFile)>>3)==0) && !blocked)
		{
			const newSquare = Square.make(newRank,newFile);
			
			squaresArray.push(newSquare);
			blocked = squaresOccupiedBitVector.read(newSquare);
			newRank += rankOffset;
			newFile += fileOffset;
		}
	}
	return squaresArray;
}

//for patterns that extend as far as possible in directions from a starting square
function bitsInDirectionsFromSquareInGame(directions,square,game)
{
	const squaresBits = new BitVector64();
	
	const squaresOccupiedBitVector = game.squaresOccupiedBitVector;
	
	const rank = Square.rank(square);
	const file = Square.file(square);
	
	for(let i=0; i<directions.length; i+=2)
	{
		const rankOffset = directions[i];
		const fileOffset = directions[i+1];
		
		let newRank = rank+rankOffset;
		let newFile = file+fileOffset;
		let blocked = false;
		
		while((((newRank|newFile)>>3)==0) && !blocked)
		{
			const newSquare = Square.make(newRank,newFile);
			
			squaresBits.set(newSquare);
			
			blocked = squaresOccupiedBitVector.read(newSquare);
			newRank += rankOffset;
			newFile += fileOffset;
		}
	}
	return squaresBits;
}

module.exports = {
	squaresAndBitsInDirectionsFromSquareInGame:squaresAndBitsInDirectionsFromSquareInGame,
	squaresInDirectionsFromSquareInGame:squaresInDirectionsFromSquareInGame,
	bitsInDirectionsFromSquareInGame:bitsInDirectionsFromSquareInGame,
	squaresAndBitsInPatternFromSquareInGame:squaresAndBitsInPatternFromSquareInGame,
	squaresInPatternFromSquareInGame:squaresInPatternFromSquareInGame,
	bitsInPatternFromSquareInGame:bitsInPatternFromSquareInGame
};