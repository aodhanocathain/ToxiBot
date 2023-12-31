const {Game} = require("./Chess Javascript Code/Game.js");

//static DEFAULT_FEN_STRING = "8/4Br2/8/8/8/8/p1P5/k1Kb4 w - - 0 1";	//win the rook in 9ish halfmoves
	
//static DEFAULT_FEN_STRING = "4k3/6P1/8/8/8/8/1p6/4K3 w KQkq - 0 1";	//promotion test
//static DEFAULT_FEN_STRING = "4k3/6P1/8/8/8/8/1p6/B3K3 b KQkq - 0 1";	//capture with promotion test

//static DEFAULT_FEN_STRING = "rnbqkbnr/ppp2ppp/4p3/3pP3/8/8/PPPP1PPP/RNBQKBNR w - d 0 3";	//en passant test
//static DEFAULT_FEN_STRING = "4k3/8/4p3/3pP3/8/8/8/4K3 w - d 0 3";	//en passant test
	
//static DEFAULT_FEN_STRING = "3k4/5Q2/K7/8/8/8/8/8 b - - 0 1";	//white gives checkmate in 2 test (evaluate at 5)
//static DEFAULT_FEN_STRING = "b6K/4qq2/8/8/8/8/Q7/7k w KQkq - 0 1";	//stalemate test (queen sac) (evaluate at 3)

test("find checkmate in 1", ()=>{
	expect(new Game("k7/8/K7/Q7/8/8/8/8 w KQkq - 0 1").evaluate(2).bestMove.toString()).toBe("Qd8#");
});