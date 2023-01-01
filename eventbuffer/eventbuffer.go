package eventbuffer

import "time"

// Buffer is a generic interface that defines
// the actions of an event buffer
type Buffer[T any] interface {
	Channel() <-chan *T
	Ack(msg *MessageMeta)
	Nack(msg *MessageMeta, err error)
	Publish(item *MessageMeta)
	StartProcessing(f func(msg *MessageMeta) error)
}

type MessageMeta struct {
	CreateDate      time.Time
	LastAttemptDate time.Time
	AttemptCount    int
	AttemptErrors   []error
	Payload         []byte
}
