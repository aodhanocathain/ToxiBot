const {parentPort} = require("worker_threads");
const {Game} = require("./Game.js");

parentPort.on("message", (objectString)=>{
	const message = JSON.parse(objectString);
	const game = new Game(message.gameString);
	
	const evaluation = game.fancyEvaluate(message.workerDepth);
	
	const nonCircularEvaluation = 
	(!evaluation) ? 
		(game.movingTeam.opposition.numKingSeers>0)? 
			{checkmate_in_halfmoves: 0}
			:
			{score: 0}
		:
		("checkmate_in_halfmoves" in evaluation)?
			{"checkmate_in_halfmoves": evaluation.checkmate_in_halfmoves+1}
			:
			{"score":evaluation.score}
	;
			
	parentPort.postMessage(JSON.stringify(nonCircularEvaluation));
	process.exit();
});