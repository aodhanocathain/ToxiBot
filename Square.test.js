const {SquareList} = require("./Chess Javascript Code/Square.js")

test("square list iterator works as expected", ()=>{
    const list = new SquareList();
    let squares = [12,53];

    for(const square of squares)
    {
        list.add(square);
    }

    let i=0;
    for(const square of list)
    {
        expect(square).toEqual(squares[i]);
        i++;
    }
});