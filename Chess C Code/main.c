#include "DoublyLinkedList.h"
#include "Square.h"
#include "Move.h"

#include <stdio.h>

int main()
{
	DoublyLinkedList* list = DoublyLinkedList_create();
	for(long long int i=0; i<5; i++)
	{
		DoublyLinkedList_push(list, i);
	}
	
	DoublyLinkedList_print(list);
	printf("\n");
	
	Square a1 = Square_make(0,0);
	
	Square_print(a1);
	printf("\n");
	
	Square b4 = Square_make(4,1);
	
	Move move = Move_make(a1,b4);
	
	Move_print(move);
	printf("\n");
	
	return 0;
}