package eventbuffer

import "time"

// Buffer is a generic interface that defines
// the actions of an event buffer
type Buffer[T any] interface {
	Ack(msg *MessageMeta[T])
	Nack(msg *MessageMeta[T], err error)
	Publish(msg *MessageMeta[T])
	StartProcessing() <-chan *MessageMeta[T]
}

type GenericBuffer[T any] struct{}

func (b *GenericBuffer[T]) Ack(msg *MessageMeta[T]) {
	panic("unimplemented")
}

func (b *GenericBuffer[T]) Nack(msg *MessageMeta[T], err error) {
	msg.AttemptCount++

	if err != nil {
		if msg.AttemptErrors == nil {
			msg.AttemptErrors = []error{err}
		} else {
			msg.AttemptErrors = append(msg.AttemptErrors, err)
		}
	}

	b.Publish(msg)
}

func (b *GenericBuffer[T]) Publish(msg *MessageMeta[T]) {
	panic("unimplemented")
}

func (b *GenericBuffer[T]) StartProcessing() <-chan *MessageMeta[T] {
	panic("unimplemented")
}

type MessageMeta[T any] struct {
	CreateDate      time.Time
	LastAttemptDate time.Time
	AttemptCount    int
	AttemptErrors   []error
	Payload         T
}
