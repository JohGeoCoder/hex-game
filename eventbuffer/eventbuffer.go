package eventbuffer

import "time"

// Buffer is a generic interface that defines
// the actions of an event buffer
type Buffer interface {
	Ack(msg *MessageMeta)
	Nack(msg *MessageMeta, err error)
	Publish(msg *MessageMeta)
	StartProcessing() <-chan *MessageMeta
}

type MessageMeta struct {
	CreateDate      time.Time
	LastAttemptDate time.Time
	AttemptCount    int
	AttemptErrors   []error
	Payload         []byte
}
