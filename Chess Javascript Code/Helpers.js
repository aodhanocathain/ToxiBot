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
	
	generateMask(length)
	//generate a mask *length* bits wide
	{
		return (1 << length)-1;
	},
	
	imageFileName(teamName, pieceName)
	{
		return `./images/chess/${teamName}/${pieceName}.png`;
	}
};