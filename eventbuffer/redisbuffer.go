package eventbuffer

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/go-redis/redis/v8"
	"hexgridgame.com/config"
)

// RedisBuffer is an implementation of a generic buffer
type RedisBuffer[T any] struct {
	GenericBuffer[T]

	ctx         context.Context
	rdb         *redis.Client
	channelName string
	ch          <-chan *redis.Message
}

// Ack acknowledges that the message has been
// processed successfully
func (b *RedisBuffer[T]) Ack(msg *MessageMeta[T]) {
	return
}

// Nack puts the message back into the buffer. This is often
// called when the message is not processed successfully
func (b *RedisBuffer[T]) Nack(msg *MessageMeta[T], err error) {

	msg.AttemptCount++

	if err != nil {
		if msg.AttemptErrors == nil {
			msg.AttemptErrors = []error{err}
		} else {
			msg.AttemptErrors = append(msg.AttemptErrors, err)
		}
	}

	b.rdb.Publish(b.ctx, b.channelName, msg)
}

// Publish adds an item to the buffer
func (b *RedisBuffer[T]) Publish(msg *MessageMeta[T]) {
	bytes, err := json.Marshal(msg)
	if err != nil {
		fmt.Println("Metadata marshal error", err)
	}
	b.rdb.Publish(b.ctx, b.channelName, bytes)
}

// StartProcessing begins listening for and processing messages
// as they come in through the buffer. The listener is started in
// its own goroutine so it does not block the main thread.
func (b *RedisBuffer[T]) StartProcessing() <-chan *MessageMeta[T] {
	mmChan := make(chan *MessageMeta[T], 10)

	go func() {
		for msg := range b.ch {
			mm := &MessageMeta[T]{}
			err := json.Unmarshal([]byte(msg.Payload), mm)
			if err != nil {
				fmt.Println("Message Unmarshal Error", err)
				return
			}

			mmChan <- mm
		}
	}()

	return mmChan
}

// NewRedisBuffer instantiates and returns a Redis
// Pub Sub implementation as a buffer
func NewRedisBuffer[T any](ctx context.Context) Buffer[T] {
	cfg := config.Get()

	// Initialize Redis
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddress,
		Password: "",
	})

	// Test the Redis connection
	err := rdb.Ping(ctx).Err()
	if err != nil {
		log.Fatal(err.Error())
	}

	pubsub := rdb.Subscribe(ctx, cfg.RedisPubSubChannel)
	ch := pubsub.Channel()

	return &RedisBuffer[T]{
		ctx:         ctx,
		channelName: cfg.RedisPubSubChannel,
		rdb:         rdb,
		ch:          ch,
	}
}
