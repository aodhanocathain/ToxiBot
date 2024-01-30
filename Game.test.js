const {Game} = require("./Chess Javascript Code/Game.js");

//static DEFAULT_FEN_STRING = "8/4Br2/8/8/8/8/p1P5/k1Kb4 w - - 0 1";	//win the rook in 9ish halfmoves

//working rules
test("white can castle", ()=>{
	const moves = new Game("4k3/8/8/8/8/8/8/R3K2R w KQkq - 0 1").calculateLegals().map((move)=>{
		return move.toString();
	})
	expect(moves).toContain("O-O");
	expect(moves).toContain("O-O-O");
});

test("black can castle", ()=>{
	const moves = new Game("r3k2r/8/8/8/8/8/8/4K3 b KQkq - 0 1").calculateLegals().map((move)=>{
		return move.toString();
	})
	expect(moves).toContain("O-O");
	expect(moves).toContain("O-O-O");
});

test("white can't castle through check", ()=>{
	const moves = new Game("2r1kr2/8/8/8/8/8/8/R3K2R w KQkq - 0 1").calculateLegals().map((move)=>{
		return move.toString();
	})
	expect(moves).not.toContain("O-O");
	expect(moves).not.toContain("O-O-O");
});

test("black can't castle through check", ()=>{
	const moves = new Game("r3k2r/8/8/8/8/8/8/2R1KR2 b KQkq - 0 1").calculateLegals().map((move)=>{
		return move.toString();
	})
	expect(moves).not.toContain("O-O");
	expect(moves).not.toContain("O-O-O");
});

test("doing and undoing a move preserves available moves", ()=>{
	const game = new Game();
	const legals = game.calculateLegals();
	const strings = legals.map((legal)=>{return legal.toString();});
	for(let i=0; i<legals.length; i++)
	{
		game.makeMove(legals[i]);
		game.undoMove();
		expect(game.calculateLegals().map((legal)=>{return legal.toString();})).toEqual(strings);
	}
});

//competency
test("find checkmate in 1", ()=>{
	expect(new Game("k7/8/K7/Q7/8/8/8/8 w KQkq - 0 1").ABevaluate(2).bestMove.toString()).toBe("Qd8#");
});

test("find checkmate in 2", ()=>{
	expect(new Game("2k5/5Q2/K7/8/8/8/8/8 w - - 1 2").ABevaluate(4).bestMove.toString()).toBe("Qe7");
});

test("find queen sac for stalemate", ()=>{
	expect(new Game("b6K/4qq2/8/8/8/8/Q5p1/7k w KQkq - 0 1").ABevaluate(3).bestMove.toString()).toBe("Qxg2+");
});

//competency and working rules
test("find en passant pt1", ()=>{
	expect(new Game("4k3/8/4p3/3pP3/8/8/8/4K3 w - d 0 3").ABevaluate(1).bestMove.toString()).toBe("exd6");
});

test("find en passant pt2", ()=>{
	expect(new Game("rnbqkbnr/ppp2ppp/4p3/3pP3/8/8/PPPP1PPP/RNBQKBNR w - d 0 3").ABevaluate(1).bestMove.toString()).toBe("exd6");
});

test("pawn promotion by capture", ()=>{
	expect(new Game("4k3/6P1/8/8/8/8/1p6/B3K3 b KQkq - 0 1").ABevaluate(1).bestMove.toString()).toBe("bxa1=Q+");
});

test("pawn promotion", ()=>{
	expect(new Game("4k3/6P1/8/8/8/8/1p6/4K3 w KQkq - 0 1").ABevaluate(1).bestMove.toString()).toBe("g8=Q+");
});