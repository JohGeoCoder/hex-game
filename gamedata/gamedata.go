package gamedata

import (
	"encoding/json"
	"fmt"

	"github.com/gorilla/websocket"
	"hexgridgame.com/eventbuffer"
	"hexgridgame.com/models"
)

type GameDataInternal struct {
	players map[string]*PlayerDataInternal
	buf     eventbuffer.Buffer
}

type PlayerDataInternal struct {
	ID         string
	Connection *websocket.Conn
	PosX       int
	PosY       int
}

func NewGame(buf eventbuffer.Buffer) *GameDataInternal {
	return &GameDataInternal{
		players: make(map[string]*PlayerDataInternal),
		buf:     buf,
	}
}

func (g *GameDataInternal) AddPlayer(id string, conn *websocket.Conn) {
	g.players[id] = &PlayerDataInternal{
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

			msg := &eventbuffer.MessageMeta{
				Payload: p,
			}

			g.buf.Publish(msg)
		}
	}()
}

func (g *GameDataInternal) UpdatePlayer(p *models.Player) {
	iPlayerData := g.players[p.ID]
	iPlayerData.PosX = p.PosX
	iPlayerData.PosY = p.PosY
}

func (g *GameDataInternal) NotifyPlayersGameState() {
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

func (g *GameDataInternal) StartProcessing(f func(game *GameDataInternal, f *eventbuffer.MessageMeta) error) {
	go func() {
		mmChan := g.buf.StartProcessing()

		for mm := range mmChan {

			if err := f(g, mm); err != nil {
				g.buf.Nack(mm, err)
				return
			}

			g.buf.Ack(mm)
		}
	}()
}
