package main

import (
	"bytes"
	"context"
	"encoding/gob"
	"fmt"
	"log"
	"net/http"

	"github.com/go-redis/redis/v8"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

const (
	serverHost = "localhost"
	serverPort = "5001"
)

var connections map[string]*websocket.Conn = make(map[string]*websocket.Conn)

type gameMessage struct {
	SocketMessageType int
	GameMessageType   string
	Payload           []byte
}

func main() {
	rdb := redis.NewClient(&redis.Options{
		Addr:     "69.164.219.100:6379",
		Password: "",
	})

	ctx := context.Background()

	err := rdb.Ping(ctx).Err()
	if err != nil {
		log.Fatal(err.Error())
	}

	setupRoutes(ctx, rdb)
	go messageProcessor(ctx, rdb)

	address := fmt.Sprintf("%s:%s", serverHost, serverPort)
	log.Printf("Listening on %s", address)
	err = http.ListenAndServe(address, nil)
	if err != nil {
		log.Fatal(err)
	}
}

func setupRoutes(ctx context.Context, redisClient *redis.Client) {
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)
	http.HandleFunc("/ws", getWsEndpoint(ctx, redisClient))
}

func getWsEndpoint(ctx context.Context, redisClient *redis.Client) func(http.ResponseWriter, *http.Request) {

	return func(w http.ResponseWriter, r *http.Request) {
		var upgrader = websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		}

		//CORS
		upgrader.CheckOrigin = func(r *http.Request) bool { return true }

		//Upgrade connection to a WebSocket
		ws, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			fmt.Println(err.Error())
		}

		fmt.Println("Client Connected")

		connID := uuid.New().String()

		connections[connID] = ws

		connectionListener(ctx, ws, redisClient, connID)
	}
}

func messageProcessor(ctx context.Context, rdb *redis.Client) {
	pubsub := rdb.Subscribe(ctx, "channel1")

	ch := pubsub.Channel()

	for msg := range ch {

		buf := bytes.NewBuffer([]byte(msg.Payload))
		g := &gameMessage{}
		_ = gob.NewDecoder(buf).Decode(g)

		for _, c := range connections {
			c.WriteMessage(websocket.TextMessage, g.Payload)
		}
	}
}

func connectionListener(ctx context.Context, conn *websocket.Conn, redisClient *redis.Client, connID string) {
	for {
		messageType, p, err := conn.ReadMessage()
		if err != nil {
			fmt.Println(err.Error())
			return
		}

		gameMessage := &gameMessage{
			SocketMessageType: messageType,
			GameMessageType:   "",
			Payload:           p,
		}

		var buf bytes.Buffer
		gob.NewEncoder(&buf).Encode(gameMessage)

		redisClient.Publish(ctx, "channel1", buf.Bytes())
	}
}
