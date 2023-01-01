package models

type GameMessage struct {
	GameMessageType string `json:"gameMessageType"`
	Payload         string `json:"payload"`
}

type GameState struct {
	Players []Player `json:"players"`
}

type Player struct {
	ID   string `json:"id"`
	PosX int    `json:"posXHex"`
	PosY int    `json:"posYHex"`
}
