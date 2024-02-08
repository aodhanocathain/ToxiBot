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

	extractBits(bitvector64, indices)	//serial version of PEXT
	{
		//this function will only ever be used to extract less than 32 bits
		//therefore the result will fit in a single integer
		let extractedBits = 0;
		let i = 0;
		for(const scan of indices)
		{
			if(bitvector64.read(scan))
			{
				extractedBits |= (1<<i++);
			}
		}
		return extractedBits;
	}
};