const {SquareList} = require("./Chess Javascript Code/Square.js")
const {BitVector64} = require("./Chess Javascript Code/BitVector64.js");
const {extractBits, countTrailingZeroesInBits, countTrailingZeroesInBitsPlus1IfNonzero, countLeadingZeroesInBits, countLeadingZeroesInBitsPlus1IfNonzero, popLSB} = require("./Chess Javascript Code/Helpers.js");

test("extractBits works as expected", ()=>{
    let bv = new BitVector64();
    let setIndices = [3,5,7];
    for(const setIndex of setIndices)
    {
        bv.set(setIndex);
    }
    let extractIndices = [1,3,5,6,7];
    let extractedBits = extractBits(bv, extractIndices);
    expect(extractedBits).toEqual(22);

    bv = new BitVector64();
    setIndices = [27,54];
    for(const setIndex of setIndices)
    {
        bv.set(setIndex);
    }
    extractIndices = [9,18,27,36,45,54];
    extractedBits = extractBits(bv, extractIndices);
    expect(extractedBits).toEqual(36);

    extractIndices = [54,27,9,18,36,45];
    extractedBits = extractBits(bv, extractIndices);
    expect(extractedBits).toEqual(3);
});

test("count trailing zeroes works as expected", ()=>{
    const num = (1 << 5) | (1 << 10);
    expect(countTrailingZeroesInBits(num, 16)).toEqual(5);
    expect(countTrailingZeroesInBits(num, 7)).toEqual(5);
    expect(countTrailingZeroesInBits(num, 3)).toEqual(3);
    expect(countTrailingZeroesInBits(0, 7)).toEqual(7);
});

test("count leading zeroes works as expected", ()=>{
    const num = 1 << (31-15);
    expect(countLeadingZeroesInBits(num, 15)).toEqual(15);
    expect(countLeadingZeroesInBits(num, 16)).toEqual(15);
    expect(countLeadingZeroesInBits(num, 17)).toEqual(15);
    expect(countLeadingZeroesInBits(0, 7)).toEqual(7);
});

test("count trailing zeroes + 1 works as expected", ()=>{
    const num = (1 << 5) | (1 << 10);
    expect(countTrailingZeroesInBitsPlus1IfNonzero(num, 16)).toEqual(6);
    expect(countTrailingZeroesInBitsPlus1IfNonzero(num, 7)).toEqual(6);
    expect(countTrailingZeroesInBitsPlus1IfNonzero(num, 3)).toEqual(3);
    expect(countTrailingZeroesInBitsPlus1IfNonzero(0, 7)).toEqual(7);
});

test("count leading zeroes + 1 works as expected", ()=>{
    const num = 1 << (31-15);
    expect(countLeadingZeroesInBitsPlus1IfNonzero(num, 15)).toEqual(15);
    expect(countLeadingZeroesInBitsPlus1IfNonzero(num, 16)).toEqual(16);
    expect(countLeadingZeroesInBitsPlus1IfNonzero(num, 17)).toEqual(16);
    expect(countLeadingZeroesInBitsPlus1IfNonzero(0, 7)).toEqual(7);
});

test("popLSB works as expected", ()=>{
    const bits = (1 << 5) | (1 << 10) | (1 << 17);
    const obj = {bits:bits};
    expect(popLSB(obj)).toEqual(5);
    expect(obj.bits).toEqual((1 << 10) | (1 << 17));
    expect(popLSB(obj)).toEqual(10);
    expect(obj.bits).toEqual(1 << 17);
    expect(popLSB(obj)).toEqual(17);
    expect(obj.bits).toEqual(0);
    expect(popLSB(obj)).toEqual(32);
    expect(obj.bits).toEqual(0);
})

test("bitvector count trailing zeroes works as expected", ()=>{
    const bv = new BitVector64();
    bv.set(12);
    expect(bv.countTrailingZeroes()).toEqual(12);
    bv.clear(12);
    bv.set(53);
    expect(bv.countTrailingZeroes()).toEqual(53);
    bv.clear(53);
    expect(bv.countTrailingZeroes()).toEqual(64);
})

test("bitvector popLSB works as expected", ()=>{
    const bv = new BitVector64();
    bv.set(12);
    bv.set(53);
    expect(bv.popLSB()).toEqual(12);
    expect(bv.popLSB()).toEqual(53);
    expect(bv.popLSB()).toEqual(64);
})

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