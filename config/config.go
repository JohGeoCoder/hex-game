package config

import (
	"log"

	"github.com/caarlos0/env/v6"
)

// Config values populated from Environment Variables
// with defaults
type Config struct {
	ServerHost         string `env:"SERVER_HOST" envDefault:"localhost:5001"`
	RedisPubSubChannel string `env:"REDIS_PUBSUB_CHANNEL" envDefault:"channel1"`
	RedisAddress       string `env:"REDIS_ADDRESS" envDefault:"69.164.219.100:6379"`
}

var cfg Config

// Get retrieves the Config singleton.
func Get() Config {
	if (cfg == Config{}) {
		if err := env.Parse(&cfg); err != nil {
			log.Fatal("Error parsing config", err)
		}
	}

	return cfg
}
