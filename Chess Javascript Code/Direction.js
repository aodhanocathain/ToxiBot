class Direction
{
	rankIncrement;
	fileIncrement;

	constructor(rankIncrement, fileIncrement)
	{
		this.rankIncrement = rankIncrement;
		this.fileIncrement = fileIncrement;
	}
	
	toString()
	{
		return `${this.rankIncrement},${this.fileIncrement}`;
	}
}

const UP = new Direction(1,0);
const DOWN = new Direction(-1,0);
const LEFT = new Direction(0,-1);
const RIGHT = new Direction(0,1);

const UP_AND_LEFT = new Direction(1,-1);
const UP_AND_RIGHT = new Direction(1,1);
const DOWN_AND_LEFT = new Direction(-1,-1);
const DOWN_AND_RIGHT = new Direction(-1,1);


module.exports = {
	Direction:Direction,
	
	UP:UP,
	DOWN:DOWN,
	LEFT:LEFT,
	RIGHT:RIGHT,
	
	UP_AND_LEFT:UP_AND_LEFT,
	UP_AND_RIGHT:UP_AND_RIGHT,
	DOWN_AND_LEFT:DOWN_AND_LEFT,
	DOWN_AND_RIGHT:DOWN_AND_RIGHT,	
}