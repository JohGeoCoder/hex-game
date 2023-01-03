package queue

// Queue is an generic interface that describes a Queue
type Queue[T interface{}] interface {
	Enqueue(item *T)
	Dequeue() *T
	Peek() *T
}

// Node is a linked object that contains a generic Item
type Node[T interface{}] struct {
	item *T
	next *Node[T]
}
