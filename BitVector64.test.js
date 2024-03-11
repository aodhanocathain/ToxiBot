const {BitVector64} = require("./Chess Javascript Code/BitVector64.js");

test("bitvector count trailing zeroes works as expected", ()=>{
    const bv = new BitVector64();
    bv.set(12);
    expect(bv.countTrailingZeroes()).toEqual(12);
    bv.clear(12);
    bv.set(53);
    expect(bv.countTrailingZeroes()).toEqual(53);
    bv.clear(53);
    expect(bv.countTrailingZeroes()).toEqual(64);
});

test("bitvector popLSB works as expected", ()=>{
    const bv = new BitVector64();
    bv.set(12);
    bv.set(53);
    expect(bv.popLSB()).toEqual(12);
    expect(bv.popLSB()).toEqual(53);
    expect(bv.popLSB()).toEqual(64);
});

test("bitvector extractBits with array works as expected", ()=>{
    let bv = new BitVector64();
    let setIndices = [3,5,7];
    for(const setIndex of setIndices)
    {
        bv.set(setIndex);
    }
    let extractIndices = [1,3,5,6,7];
    let extractedBits = bv.extractBitsUsingArray(extractIndices);
    expect(extractedBits).toEqual(22);

    bv = new BitVector64();
    setIndices = [27,54];
    for(const setIndex of setIndices)
    {
        bv.set(setIndex);
    }
    extractIndices = [9,18,27,36,45,54];
    extractedBits = bv.extractBitsUsingArray(extractIndices);
    expect(extractedBits).toEqual(36);

    extractIndices = [54,27,9,18,36,45];
    extractedBits = bv.extractBitsUsingArray(extractIndices);
    expect(extractedBits).toEqual(3);
});