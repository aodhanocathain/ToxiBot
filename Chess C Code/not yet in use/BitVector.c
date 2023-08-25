#include "BitVector.h"

BitVector BitVector_make()
{
	return (BitVector)0;
}

int BitVector_read(BitVector b, int i)
{
	return (b >> i) & (BitVector)1;
}

BitVector BitVector_write(BitVector b, int i)
{
	return b | (((BitVector)1) << i);
}

BitVector BitVector_or(BitVector b1, BitVector b2)
{
	return b1 | b2;
}

void BitVector_print(BitVector b)
{
	for(int byte=7; byte>=0; byte--)
	{
		for(int bit=7; bit>=0; bit--)
		{
			printf("%d", BitVector_read(b, ((byte*8)+bit)));
		}
		printf(" ");
	}
}