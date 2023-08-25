#pragma once

#include "Node.h"
#include "Item.h"

typedef struct {
	Node* head;
	Node* tail;
	int length;
} DoublyLinkedList;

DoublyLinkedList* DoublyLinkedList_create();
void DoublyLinkedList_destroy(DoublyLinkedList* list);

void DoublyLinkedList_push(DoublyLinkedList* list, Item item);
Item DoublyLinkedList_pop(DoublyLinkedList* list);

void DoublyLinkedList_print(DoublyLinkedList* list);