const {Game} = require("./Chess Javascript Code/Game.js");

//static DEFAULT_FEN_STRING = "8/4Br2/8/8/8/8/p1P5/k1Kb4 w - - 0 1";	//win the rook in 9ish halfmoves

//working rules
test("white can castle", ()=>{
	const game = new Game("4k3/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
	const moves = game.calculateLegals().map((move)=>{
		return move.toString(game);
	})
	expect(moves).toContain("O-O");
	expect(moves).toContain("O-O-O");
});

test("black can castle", ()=>{
	const game = new Game("r3k2r/8/8/8/8/8/8/4K3 b KQkq - 0 1");
	const moves = game.calculateLegals().map((move)=>{
		return move.toString(game);
	})
	expect(moves).toContain("O-O");
	expect(moves).toContain("O-O-O");
});

test("white can't castle through check", ()=>{
	const game = new Game("2r1kr2/8/8/8/8/8/8/R3K2R w KQkq - 0 1");
	const moves = game.calculateLegals().map((move)=>{
		return move.toString(game);
	})
	expect(moves).not.toContain("O-O");
	expect(moves).not.toContain("O-O-O");
});

test("black can't castle through check", ()=>{
	const game = new Game("r3k2r/8/8/8/8/8/8/2R1KR2 b KQkq - 0 1");
	const moves = game.calculateLegals().map((move)=>{
		return move.toString(game);
	})
	expect(moves).not.toContain("O-O");
	expect(moves).not.toContain("O-O-O");
});

test("doing and undoing a move preserves available moves", ()=>{
	const game = new Game();
	const legals = game.calculateLegals();
	const strings = legals.map((legal)=>{return legal.toString(game);});
	for(let i=0; i<legals.length; i++)
	{
		game.makeMove(legals[i]);
		game.undoMove();
		const samestrings = game.calculateLegals().map((legal)=>{return legal.toString(game);})
		expect(samestrings).toEqual(strings);
	}
});

//competency
test("find checkmate in 1", ()=>{
	const game = new Game("k7/8/K7/Q7/8/8/8/8 w KQkq - 0 1");
	expect(game.ABevaluate(2).bestMove.toString(game)).toBe("Qd8#");
});

test("find checkmate in 2", ()=>{
	const game = new Game("2k5/5Q2/K7/8/8/8/8/8 w - - 1 2")
	expect(game.ABevaluate(4).bestMove.toString(game)).toBe("Qe7");
});

test("find queen sac for stalemate", ()=>{
	const game = new Game("b6K/4qq2/8/8/8/8/Q5p1/7k w KQkq - 0 1")
	expect(game.ABevaluate(3).bestMove.toString(game)).toBe("Qxg2+");
});

//competency and working rules
test("find en passant pt1", ()=>{
	const game = new Game("4k3/8/4p3/3pP3/8/8/8/4K3 w - d 0 3");
	expect(game.ABevaluate(1).bestMove.toString(game)).toBe("exd6");
});

test("find en passant pt2", ()=>{
	const game = new Game("rnbqkbnr/ppp2ppp/4p3/3pP3/8/8/PPPP1PPP/RNBQKBNR w - d 0 3");
	expect(game.ABevaluate(1).bestMove.toString(game)).toBe("exd6");
});

test("pawn promotion by capture", ()=>{
	const game = new Game("4k3/6P1/8/8/8/8/1p6/B3K3 b KQkq - 0 1");
	expect(game.ABevaluate(1).bestMove.toString(game)).toBe("bxa1=Q+");
});

test("pawn promotion", ()=>{
	const game = new Game("4k3/6P1/8/8/8/8/1p6/4K3 w KQkq - 0 1");
	expect(game.ABevaluate(1).bestMove.toString(game)).toBe("g8=Q+");
});