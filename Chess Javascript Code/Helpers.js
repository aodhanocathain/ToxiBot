module.exports = {
	asciiOffset(character, offset)
	{
		return String.fromCharCode(character.charCodeAt(0) + offset);
	},
	mask(length)
	{
		return (1 << length)-1;
	}
}