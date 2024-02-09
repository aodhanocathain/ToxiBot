const {BitVector64} = require("./Chess Javascript Code/BitVector64.js");
const {extractBits} = require("./Chess Javascript Code/Helpers.js");

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
