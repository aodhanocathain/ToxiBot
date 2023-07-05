module.exports = {
	asciiOffset(character, offset)
	{
		return String.fromCharCode(character.charCodeAt(0) + offset);
	}
}