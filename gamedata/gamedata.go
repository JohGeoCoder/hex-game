package gamedata

import (
	"encoding/json"
	"fmt"

	"github.com/gorilla/websocket"
	"hexgridgame.com/eventbuffer"
	"hexgridgame.com/models"
)

type Game struct {
	players     map[string]*PlayerData
	computers   map[string]*ComputerData
	bufIncoming eventbuffer.Buffer[[]byte]
	bufOutgoing eventbuffer.Buffer[byte]
}

type PlayerData struct {
	ID         string
	Connection *websocket.Conn
	PosX       int
	PosY       int
}

type ComputerData struct {
	ID   string
	PosX float64
	PosY float64
}

func NewGame(incomingBuffer eventbuffer.Buffer[[]byte], outgoingBuffer eventbuffer.Buffer[byte]) *Game {
	return &Game{
		players:     make(map[string]*PlayerData),
		computers:   make(map[string]*ComputerData),
		bufIncoming: incomingBuffer,
		bufOutgoing: outgoingBuffer,
	}
}

func (g *Game) AddPlayer(id string, conn *websocket.Conn) {
	g.players[id] = &PlayerData{
		ID:         id,
		Connection: conn,
	}

	// Start listening for messages from the socket connection
	go func() {
		for {
			_, p, err := conn.ReadMessage()
			if err != nil {
				fmt.Println(err.Error())
				return
			}

			msg := &eventbuffer.MessageMeta[[]byte]{
				Payload: p,
			}

			g.bufIncoming.Publish(msg)
		}
	}()
}

func (g *Game) UpdatePlayer(playerID string, opts ...func(*PlayerData)) {

	player := g.players[playerID]

	for _, o := range opts {
		o(player)
	}
}

func WithPosition(pos models.Position) func(*PlayerData) {
	return func(pd *PlayerData) {
		pd.PosX = pos.PosX
		pd.PosY = pos.PosY
	}
}

func (g *Game) NotifyPlayersGameState() {
	st := models.GameState{
		Players: []models.Player{},
	}

	for _, p := range g.players {
		st.Players = append(st.Players, models.Player{
			ID:   p.ID,
			PosX: p.PosX,
			PosY: p.PosY,
		})
	}

	mBytes, err := json.Marshal(st)
	if err != nil {
		fmt.Println("Game State marshal error", err)
		return
	}

	for _, c := range g.players {
		c.Connection.WriteMessage(websocket.TextMessage, mBytes)
	}
}

func (g *Game) ScheduleGameUpdate() {
	g.bufOutgoing.Publish(&eventbuffer.MessageMeta[byte]{})
}

func (g *Game) StartProcessingIncoming(f func(*Game, *eventbuffer.MessageMeta[[]byte]) error) {

	// Begin reading messages from the incoming buffer
	go func() {
		mmChan := g.bufIncoming.StartProcessing()

		for mm := range mmChan {

			if err := f(g, mm); err != nil {
				g.bufIncoming.Nack(mm, err)
				return
			}

			g.bufIncoming.Ack(mm)
		}
	}()
}

func (g *Game) StartProcessingOutgoing() {
	// Begin processing the messages from the outgoing buffer
	go func() {
		gsChan := g.bufOutgoing.StartProcessing()

		for mm := range gsChan {

			g.NotifyPlayersGameState()
			g.bufOutgoing.Ack(mm)
		}
	}()
}
