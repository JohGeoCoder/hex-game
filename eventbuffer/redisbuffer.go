package eventbuffer

import (
	"context"
	"log"

	"github.com/go-redis/redis/v8"
	"hexgridgame.com/config"
)

// RedisBuffer is an implementation of a generic buffer
type RedisBuffer struct {
	ctx         context.Context
	rdb         *redis.Client
	channelName string
	ch          <-chan *redis.Message
}

// Channel returns the buffer that feeds events
func (b *RedisBuffer) Channel() <-chan *redis.Message {
	return b.Channel()
}

// Ack acknowledges that the message has been
// processed successfully
func (b *RedisBuffer) Ack(msg *redis.Message) {
	return
}

// Nack puts the message back into the buffer. This is often
// called when the message is not processed successfully
func (b *RedisBuffer) Nack(msg *redis.Message) {
	b.rdb.Publish(b.ctx, b.channelName, msg.Payload)
}

// Publish adds an item to the buffer
func (b *RedisBuffer) Publish(item any) {
	b.rdb.Publish(b.ctx, b.channelName, item)
}

// StartProcessing begins listeng for and processing messages
// as they come in through the buffer. The listener is started in
// its own goroutine so it does not block the main thread.
func (b *RedisBuffer) StartProcessing(f func(*redis.Message) error) {
	go func() {
		for msg := range b.ch {
			if err := f(msg); err != nil {
				b.Nack(msg)
				return
			}

			b.Ack(msg)
		}
	}()
}

// NewRedisBuffer instantiates and returns a Redis
// Pub Sub implementation as a buffer
func NewRedisBuffer(ctx context.Context) Buffer[redis.Message] {
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

	return &RedisBuffer{
		ctx:         ctx,
		channelName: cfg.RedisPubSubChannel,
		rdb:         rdb,
		ch:          ch,
	}
}
