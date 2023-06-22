module.exports = {
	asciiOffset(character, offset)
	{
		return String.fromCharCode(character.charCodeAt(0) + offset);
	},
	asciiDistance(character, baseCharacter)
	{
		return Math.abs(character.charCodeAt(0) - baseCharacter.charCodeAt(0));
	}
}