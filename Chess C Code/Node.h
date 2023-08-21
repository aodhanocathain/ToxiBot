#pragma once

#include "Item.h"

struct Node;
typedef struct Node Node;

struct Node {
	Item item;
	Node* prev;
	Node* next;
};

Node* Node_create(Item item);
void Node_destroy(Node* node);