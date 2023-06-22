class Team
{
	char;
	charConverter;
	
	constructor(char, charConverter)
	{
		this.char = char;
		this.charConverter = charConverter;
	}
	
	static ofTeamedChar(teamedChar)
	{
		if(WHITE_TEAM.charConverter(teamedChar)==teamedChar)
		{
			return WHITE_TEAM;
		}
		else
		{
			return BLACK_TEAM;
		}
	}
	
	toString()
	{
		return `${this.char}`;
	}
}

//every piece in every game in the code should belong to one of these two teams
const WHITE_TEAM = new Team("w", function(char){return char.toUpperCase();});
const BLACK_TEAM = new Team("b", function(char){return char.toLowerCase();});

module.exports = {	
	WHITE_TEAM:WHITE_TEAM,
	BLACK_TEAM:BLACK_TEAM,
	
	Team:Team
}