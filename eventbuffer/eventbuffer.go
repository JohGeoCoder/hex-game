package eventbuffer

// Buffer is a generic interface that defines
// the actions of an event buffer
type Buffer[T any] interface {
	Channel() <-chan *T
	Ack(msg *T)
	Nack(msg *T)
	Publish(item any)
	StartProcessing(f func(msg *T) error)
}
