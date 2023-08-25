#include "helpers.h"

char toUpperCase(char letter){
	if(letter>='a' && letter<='z')
	{
		return letter - 0x20;
	}
	else
	{
		return letter;
	}
}

char toLowerCase(char letter){
	if(letter>='A' && letter<='Z')
	{
		return letter + 0x20;
	}
	else
	{
		return letter;	
	}
}