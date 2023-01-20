package eventbuffer

import "hexgridgame.com/queue"

type QueueBuffer[T any] struct {
	GenericBuffer[T]
	queue queue.Queue[MessageMeta[T]]
}

func (q *QueueBuffer[T]) Ack(msg *MessageMeta[T]) {
	return
}

func (q *QueueBuffer[T]) Publish(msg *MessageMeta[T]) {
	q.queue.Enqueue(msg)
}

func (q *QueueBuffer[T]) StartProcessing() <-chan *MessageMeta[T] {
	ch := make(chan *MessageMeta[T], 50)

	go func() {
		for {
			if msg := q.queue.Dequeue(); msg != nil {
				ch <- msg
			}
		}
	}()

	return ch
}

func NewQueueBuffer[T any]() Buffer[T] {
	return &QueueBuffer[T]{
		queue: &queue.ThreadSafeQueue[MessageMeta[T]]{},
	}
}
