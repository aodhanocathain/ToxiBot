const {BitVector64} = require("./Chess Javascript Code/BitVector64.js");
const {extractBits, countTrailingZeroesInBits, countLeadingZeroesInBits} = require("./Chess Javascript Code/Helpers.js");

const bv = new BitVector64();
const setIndices = [3,5,7];
for(const setIndex of setIndices)
{
    bv.set(setIndex);
}

const extractIndices = [1,3,5,6,7];
const extractedBits = extractBits(bv, extractIndices);

test("extractBits works as expected", ()=>{
    expect(extractedBits).toEqual(22);
});

test("count trailing zeroes works as expected", ()=>{
    const num = (1 << 5) | (1 << 10);
    expect(countTrailingZeroesInBits(num, 16)).toEqual(5);
    expect(countTrailingZeroesInBits(num, 7)).toEqual(5);
    expect(countTrailingZeroesInBits(num, 3)).toEqual(3);
    expect(countTrailingZeroesInBits(0)).toEqual(32);
});

test("count leading zeroes works as expected", ()=>{
    const num = 1 << 15;
    expect(countLeadingZeroesInBits(num, 15)).toEqual(15);
    expect(countLeadingZeroesInBits(num, 16)).toEqual(16);
    expect(countLeadingZeroesInBits(num, 17)).toEqual(16);
    expect(countLeadingZeroesInBits(0)).toEqual(32);
});