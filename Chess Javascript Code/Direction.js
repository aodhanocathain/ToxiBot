class Direction
{
	rankCoefficient;
	fileCoefficient;

	constructor(rankCoefficient, fileCoefficient)
	{
		this.rankCoefficient = rankCoefficient;
		this.fileCoefficient = fileCoefficient;
	}
}

module.exports = {
	Direction:Direction
}