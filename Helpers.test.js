const {countTrailingZeroesInBits, countTrailingZeroesInBitsPlus1IfNonzero, countLeadingZeroesInBits, countLeadingZeroesInBitsPlus1IfNonzero, popLSB} = require("./Chess Javascript Code/Helpers.js");

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