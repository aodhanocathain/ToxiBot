const {BitVector64} = require("./Chess Javascript Code/BitVector64.js");
const {extractBits, countTrailingZeroesInBits, countTrailingZeroesInBitsPlus1IfNonzero, countLeadingZeroesInBits, countLeadingZeroesInBitsPlus1IfNonzero} = require("./Chess Javascript Code/Helpers.js");

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