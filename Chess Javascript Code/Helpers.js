function countTrailingZeroesInBits(bits, numBits=32)
{
	let i=0;
	while(i<numBits)
	{
		if(((1<<i)&bits)!=0){return i;}
		i++;
	}
	return i;
}

module.exports = {
	asciiOffset(character, offset)	
	//the character whose ascii code is *offset* greater than the ascii code of *character*
	{
		return String.fromCharCode(character.charCodeAt(0) + offset);
	},
	
	asciiDistance(distantCharacter, baseCharacter)
	//how much greater the ascii code of *distantCharacter* is than the ascii code of *baseCharacter*
	{
		return distantCharacter.charCodeAt(0) - baseCharacter.charCodeAt(0);
	},
	
	deferredPromise()
	{
		let resolveFunction;
		
		const promise = new Promise((resolve, reject)=>{
			resolveFunction = resolve;
		});
		
		return {
			promise: promise,
			resolveFunction: resolveFunction
		};
	},
	
	imageFileName(teamName, pieceName)
	{
		return `./images/chess/${teamName}/${pieceName}.png`;
	},

	extractBits(bitvector64, extractIndices)	//sequential version of PEXT
	{
		//each element in extractIndices is a position to read from in bitvector64
		//each value read from bitvector64 gets written to consecutive bit positions in extractedBits

		//this function will never extract more than 32 bits, therefore the result fits in a single integer
		let extractedBits = 0;

		for(let writeIndex=0; writeIndex<extractIndices.length; writeIndex++)	//write to ascending bit positions in extractedBits
		{
			const readIndex = extractIndices[writeIndex];	//the position in bitvector64 to extract a bit from
			extractedBits |= (bitvector64.read(readIndex)<<writeIndex);
		}
		return extractedBits;
	},

	countTrailingZeroesInBits:countTrailingZeroesInBits,

	countTrailingZeroesInBitsPlus1IfNonzero(bits, numBits=32)
	{
		let i=0;
		while(i<numBits)
		{
			if(((1<<i)&bits)!=0){return i+1;}
			i++;
		}
		return i;
	},

	countLeadingZeroesInBits(bits, numBits=32)
	{
		let i=0;
		while(i<numBits)
		{
			if(((bits>>(31-i))&1)!=0){return i;}
			i++;
		}
		return i;
	},


	countLeadingZeroesInBitsPlus1IfNonzero(bits, numBits=32)
	{
		let i=0;
		while(i<numBits)
		{
			if(((bits>>(31-i))&1)!=0){return i+1;}
			i++;
		}
		return i;
	},

	popLSB(bitsObj)
	{
		const index = countTrailingZeroesInBits(bitsObj.bits);
		bitsObj.bits &= ~(1<<index);
		return index;
	},

	intsUpTo(n)	//excludes n itself
	{
		return Array(n).fill(null).map((item,index)=>{return index;});
	}
};