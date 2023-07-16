module.exports = {
	asciiOffset(character, offset)	//add offset to character's ascii value, e.g. asciiOffset(a,1)=b
	{
		return String.fromCharCode(character.charCodeAt(0) + offset);
	},
	generateMask(length)	//generate a mask *length* bits wide
	{
		return (1 << length)-1;
	}
}