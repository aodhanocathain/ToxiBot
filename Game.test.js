const {Game} = require("./Chess Javascript Code/Game.js");

//static DEFAULT_FEN_STRING = "8/4Br2/8/8/8/8/p1P5/k1Kb4 w - - 0 1";	//win the rook in 9ish halfmoves

test("find checkmate in 1", ()=>{
	expect(new Game("k7/8/K7/Q7/8/8/8/8 w KQkq - 0 1").evaluate(2).bestMove.toString()).toBe("Qd8#");
});

test("find checkmate in 2", ()=>{
	expect(new Game("2k5/5Q2/K7/8/8/8/8/8 w - - 1 2").evaluate(4).bestMove.toString()).toBe("Qe7");
});

test("find queen sac for stalemate", ()=>{
	expect(new Game("b6K/4qq2/8/8/8/8/Q5p1/7k w KQkq - 0 1").evaluate(3).bestMove.toString()).toBe("Qxg2+");
});

test("find en passant pt1", ()=>{
	expect(new Game("4k3/8/4p3/3pP3/8/8/8/4K3 w - d 0 3").evaluate(1).bestMove.toString()).toBe("exd6");
});

test("find en passant pt2", ()=>{
	expect(new Game("rnbqkbnr/ppp2ppp/4p3/3pP3/8/8/PPPP1PPP/RNBQKBNR w - d 0 3").evaluate(1).bestMove.toString()).toBe("exd6");
});

test("pawn promotion by capture", ()=>{
	expect(new Game("4k3/6P1/8/8/8/8/1p6/B3K3 b KQkq - 0 1").evaluate(1).bestMove.toString()).toBe("bxa1=Q+");
});

test("pawn promotion", ()=>{
	expect(new Game("4k3/6P1/8/8/8/8/1p6/4K3 w KQkq - 0 1").evaluate(1).bestMove.toString()).toBe("g8=Q+");
});