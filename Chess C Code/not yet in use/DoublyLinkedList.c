#include "DoublyLinkedList.h"
#include "Node.h"
#include "Item.h"

#include <stdlib.h>

DoublyLinkedList* DoublyLinkedList_create()
{
	DoublyLinkedList* list = (DoublyLinkedList*)malloc(sizeof(DoublyLinkedList));
	list->head = NULL;
	list->tail = NULL;
	list->length = 0;
	return list;
}

void DoublyLinkedList_destroy(DoublyLinkedList* list)
{
	Node* node = list->head;
	while(node != NULL)
	{
		Node* nextPtr = node->next;
		Node_destroy(node);
		node = nextPtr;
	}
	free(list);
}

void DoublyLinkedList_push(DoublyLinkedList* list, Item item)
{
	Node* newTail = Node_create(item);
	if(list->tail)	//list is not empty
	{
		list->tail->next = newTail;
		newTail->prev = list->tail;
		list->tail = newTail;
	}
	else	//list is empty
	{
		list->head = newTail;
		list->tail = newTail;
	}
	list->length++;
}

Item DoublyLinkedList_pop(DoublyLinkedList* list)
{
	Node* popNode = list->tail;
	if(list->tail->prev)	//list will have remaining elements
	{
		list->tail = list->tail->prev;
		list->tail->next = NULL;
	}
	else	//list will not have remaining elements;
	{
		list->head = NULL;
		list->tail = NULL;
	}
	
	Item item = popNode->item;
	Node_destroy(popNode);
	list->length--;
	return item;
}

void DoublyLinkedList_print(DoublyLinkedList* list)
{
	for(Node* node = list->head; node!=NULL; node = node->next)
	{
		Node_print(node);
		if((node->next)!=NULL){printf("\t");}
	}
}