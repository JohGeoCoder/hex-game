package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"hexgridgame.com/config"
	"hexgridgame.com/eventbuffer"
	"hexgridgame.com/gamedata"
	"hexgridgame.com/models"
)

const (
	serverHost = "localhost"
	serverPort = "5001"
)

func main() {
	ctx := context.Background()

	//Start listening for event messages
	buf := eventbuffer.NewQueueBuffer()
	buf.StartProcessing()

	game := gamedata.NewGame(buf)
	game.StartProcessing(processMessageFunc)

	// Set up HTTP and Socket routes
	setupRoutes(ctx, game)

	cfg := config.Get()

	log.Printf("Listening on %s", cfg.ServerHost)
	err := http.ListenAndServe(cfg.ServerHost, nil)
	if err != nil {
		log.Fatal(err)
	}
}

// This is the callback function that runs for every message
// received by the buffer.
func processMessageFunc(game *gamedata.GameDataInternal, msg *eventbuffer.MessageMeta) error {
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

		game.UpdatePlayer(p)
		game.NotifyPlayersGameState()
	}

	return nil
}

func setupRoutes(ctx context.Context, game *gamedata.GameDataInternal) {
	fs := http.FileServer(http.Dir("./static"))
	http.Handle("/", fs)
	http.HandleFunc("/ws", getWsEndpointFunc(ctx, game))
}

// getWsEndpointfunc returns a wrapped HTTP function that responds to
// WebSocket requests.
func getWsEndpointFunc(ctx context.Context, game *gamedata.GameDataInternal) func(http.ResponseWriter, *http.Request) {
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
		game.AddPlayer(connID, wsConnection)

		fmt.Println("Client Connected")
	}
}
