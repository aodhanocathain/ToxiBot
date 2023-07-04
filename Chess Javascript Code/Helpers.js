const {MIN_RANK, MIN_FILE} = require("./Constants.js");

function asciiOffset(character, offset)
{
	return String.fromCharCode(character.charCodeAt(0) + offset);
}

module.exports = {
	asciiOffset:asciiOffset,
	asciiDistance(character, baseCharacter)
	{
		return Math.abs(character.charCodeAt(0) - baseCharacter.charCodeAt(0));
	}
}