package queue

import "sync"

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

// ThreadSafeQueue is a Queue implementation that can be
// safely used by concurrent goroutines
type ThreadSafeQueue[T any] struct {
	head *Node[T]
	tail *Node[T]
	m    sync.Mutex
}

func (q *ThreadSafeQueue[T]) Enqueue(item *T) {
	q.m.Lock()
	defer q.m.Unlock()

	n := &Node[T]{item: item}

	// Case: First item in the queue

	if q.head == nil {
		q.head = n
		q.tail = n

		return
	}

	// Append the new node to the end of the queue
	// Update the tail
	q.tail.next = n
	q.tail = n
}

func (q *ThreadSafeQueue[T]) Dequeue() *T {
	q.m.Lock()
	defer q.m.Unlock()

	// Case: The queue is empty
	if q.head == nil {
		return nil
	}

	n := q.head

	// Case: Dequeueing the last item
	if q.head == q.tail {
		q.head = nil
		q.tail = nil

		return n.item
	}

	q.head = q.head.next

	return n.item
}

func (q *ThreadSafeQueue[T]) Peek() *T {
	// Case: Thread is empty
	if q.head == nil {
		return nil
	}

	return q.head.item
}
