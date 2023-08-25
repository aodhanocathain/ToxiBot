#include "Node.h"
#include "Item.h"

#include <stdlib.h>

Node* Node_create(Item item)
{
	Node* node = (Node*)malloc(sizeof(Node));
	node->item = item;
	node->prev = NULL;
	node->next = NULL;
	return node;
}

void Node_destroy(Node* node)
{
	free(node);
}

void Node_print(Node* node)
{
	printf("%lld", node->item);
}