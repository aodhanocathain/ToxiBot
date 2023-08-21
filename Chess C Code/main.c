#include "DoublyLinkedList.h"

#include <stdio.h>

int main()
{
	DoublyLinkedList* list = DoublyLinkedList_create();
	for(long long int i=0; i<5; i++)
	{
		DoublyLinkedList_push(list, i);
	}
	
	DoublyLinkedList_print(list);
	return 0;
}