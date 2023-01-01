package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/go-redis/redis/v8"
	"github.com/gorilla/websocket"
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

	buf := eventbuffer.NewRedisBuffer(ctx)
	buf.StartProcessing(func(msg *redis.Message) error {
		gm := &models.GameMessage{}
		err := json.Unmarshal([]byte(msg.Payload), gm)
		if err != nil {
			return err
		}

		if gm.GameMessageType == "position" {
			p := &models.Player{}
			err = json.Unmarshal([]byte(gm.Payload), p)
			if err != nil {
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
				return err
			}

			for _, c := range connections {
				c.WriteMessage(websocket.TextMessage, mBytes)
			}
		}

		return nil
	})

	setupRoutes(ctx, buf)

	address := fmt.Sprintf("%s:%s", serverHost, serverPort)
	log.Printf("Listening on %s", address)
	err := http.ListenAndServe(address, nil)
	if err != nil {
		log.Fatal(err)
	}
}

func setupRoutes(ctx context.Context, buf eventbuffer.Buffer[redis.Message]) {
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)
	http.HandleFunc("/ws", getWsEndpoint(ctx, buf))
}

func getWsEndpoint(ctx context.Context, buf eventbuffer.Buffer[redis.Message]) func(http.ResponseWriter, *http.Request) {

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

		connectionListener(ctx, ws, buf, connID)
	}
}

func connectionListener(ctx context.Context, conn *websocket.Conn, buf eventbuffer.Buffer[redis.Message], connID string) {
	for {
		_, p, err := conn.ReadMessage()
		if err != nil {
			fmt.Println(err.Error())
			return
		}

		buf.Publish(p)
	}
}
