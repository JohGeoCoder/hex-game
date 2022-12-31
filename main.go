package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/go-redis/redis/v8"
	"github.com/gorilla/websocket"
)

const (
	serverHost = "localhost"
	serverPort = "5001"
)

var gauge int = 0

var connections map[string]*websocket.Conn = make(map[string]*websocket.Conn)
var playerMap map[string]player = map[string]player{}

type gameMessage struct {
	GameMessageType string `json:"gameMessageType"`
	Payload         string `json:"payload"`
}

type gameState struct {
	Players []player `json:"players"`
}

type player struct {
	ID   string `json:"id"`
	PosX int    `json:"posXHex"`
	PosY int    `json:"posYHex"`
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

		connID := r.URL.Query().Get("id")

		fmt.Println("Client Connected")

		connections[connID] = ws

		connectionListener(ctx, ws, redisClient, connID)
	}
}

func messageProcessor(ctx context.Context, rdb *redis.Client) {
	pubsub := rdb.Subscribe(ctx, "channel1")

	ch := pubsub.Channel()

	for msg := range ch {
		//t := time.Now()
		gm := &gameMessage{}
		json.Unmarshal([]byte(msg.Payload), gm)

		if gm.GameMessageType == "position" {
			p := &player{}
			json.Unmarshal([]byte(gm.Payload), p)

			playerMap[p.ID] = *p

			st := gameState{
				Players: []player{},
			}

			for _, p := range playerMap {
				st.Players = append(st.Players, p)
			}

			mBytes, _ := json.Marshal(st)

			for _, c := range connections {
				c.WriteMessage(websocket.TextMessage, mBytes)
			}
		}

		//elapsed := time.Since(t)
		//fmt.Println(elapsed)

		gauge--
		fmt.Println(gauge)
	}
}

func connectionListener(ctx context.Context, conn *websocket.Conn, redisClient *redis.Client, connID string) {
	for {
		_, p, err := conn.ReadMessage()
		if err != nil {
			fmt.Println(err.Error())
			return
		}

		redisClient.Publish(ctx, "channel1", p)
		gauge++
		fmt.Println(gauge)
	}
}
