const {parentPort} = require("worker_threads");
const {Game} = require("./Game.js");

parentPort.on("message", (objectString)=>{
	const message = JSON.parse(objectString);
	const game = new Game(message.gameString);
	
	const moves = game.calculateMoves().flat(2);
	const startIndex = Math.ceil(moves.length*message.threadIndex/message.numThreads);
	const endIndex = moves.length*(message.threadIndex+1)/message.numThreads;
	
	let bestEval;
	let bestIndex;
	const choosingTeam = game.movingTeam;
	
	for(let i=startIndex; i<endIndex; i++)
	{
		game.makeMove(moves[i]);
		const evaluation = game.evaluate(message.workerDepth);
		if(choosingTeam.evalPreferredToEval(evaluation, bestEval))
		{
			bestEval = evaluation;
			bestIndex = i;
		}
		game.undoMove();
	}
	parentPort.postMessage(`${bestIndex}`);
	process.exit();
});