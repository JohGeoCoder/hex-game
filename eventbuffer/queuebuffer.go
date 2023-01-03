package eventbuffer

import "hexgridgame.com/queue"

type QueueBuffer struct {
	queue queue.Queue[MessageMeta]
}

func (q *QueueBuffer) Ack(msg *MessageMeta) {
	return
}

func (q *QueueBuffer) Nack(msg *MessageMeta, err error) {
	q.queue.Enqueue(msg)
}

func (q *QueueBuffer) Publish(msg *MessageMeta) {
	q.queue.Enqueue(msg)
}

func (q *QueueBuffer) StartProcessing() <-chan *MessageMeta {
	ch := make(chan *MessageMeta, 50)

	go func() {
		for {
			if msg := q.queue.Dequeue(); msg != nil {
				ch <- msg
			}
		}
	}()

	return ch
}

func NewQueueBuffer() Buffer {
	return &QueueBuffer{
		queue: &queue.ThreadSafeQueue[MessageMeta]{},
	}
}
