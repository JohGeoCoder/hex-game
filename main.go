package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/go-redis/redis/v8"
	"github.com/gorilla/websocket"
	"hexgridgame.com/config"
	"hexgridgame.com/eventbuffer"
	"hexgridgame.com/models"
)

const (
	serverHost = "localhost"
	serverPort = "5001"
)

var connections map[string]*websocket.Conn = make(map[string]*websocket.Conn)
var playerMap map[string]models.Player = map[string]models.Player{}

func main() {
	ctx := context.Background()

	//Start listening for event messages
	buf := eventbuffer.NewRedisBuffer(ctx)
	buf.StartProcessing(processMessageFunc)

	// Set up HTTP and Socket routes
	setupRoutes(ctx, buf)

	cfg := config.Get()

	log.Printf("Listening on %s", cfg.ServerHost)
	err := http.ListenAndServe(cfg.ServerHost, nil)
	if err != nil {
		log.Fatal(err)
	}
}

func processMessageFunc(msg *eventbuffer.MessageMeta) error {
	gm := &models.GameMessage{}
	err := json.Unmarshal(msg.Payload, gm)
	if err != nil {
		fmt.Println("Game Message unmarshal error")
		return err
	}

	if gm.GameMessageType == "playerstate" {
		p := &models.Player{}
		err := json.Unmarshal([]byte(gm.Payload), p)
		if err != nil {
			fmt.Println("Player State Unmarshal error", err)
			return err
		}

		playerMap[p.ID] = *p

		st := models.GameState{
			Players: []models.Player{},
		}

		for _, p := range playerMap {
			st.Players = append(st.Players, p)
		}

		mBytes, err := json.Marshal(st)
		if err != nil {
			fmt.Println("Game State marshal error", err)
			return err
		}

		for _, c := range connections {
			c.WriteMessage(websocket.TextMessage, mBytes)
		}
	}

	return nil
}

func setupRoutes(ctx context.Context, buf eventbuffer.Buffer[redis.Message]) {
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)
	http.HandleFunc("/ws", getWsEndpointFunc(ctx, buf))
}

func getWsEndpointFunc(ctx context.Context, buf eventbuffer.Buffer[redis.Message]) func(http.ResponseWriter, *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		var upgrader = websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
		}

		//CORS
		upgrader.CheckOrigin = func(r *http.Request) bool { return true }

		//Upgrade connection to a WebSocket
		wsConnection, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			fmt.Println(err.Error())
		}

		connID := r.URL.Query().Get("id")

		fmt.Println("Client Connected")

		connections[connID] = wsConnection

		// Start listening for messages from the socket connection
		go func() {
			for {
				_, p, err := wsConnection.ReadMessage()
				if err != nil {
					fmt.Println(err.Error())
					return
				}

				msg := &eventbuffer.MessageMeta{
					Payload: p,
				}

				buf.Publish(msg)
			}
		}()
	}
}
