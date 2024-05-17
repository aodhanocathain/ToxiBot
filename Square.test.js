const {SquareSet} = require("./Chess Javascript Code/Square.js")

test("square set iterator works as expected", ()=>{
    const set = new SquareSet();
    let squares = [12,53];

    for(const square of squares)
    {
        set.add(square);
    }

    let i=0;
    for(const square of set)
    {
        expect(square).toEqual(squares[i]);
        i++;
    }
});