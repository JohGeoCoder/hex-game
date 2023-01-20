package models

type GameMessage struct {
	GameMessageType string `json:"gameMessageType"`
	Payload         string `json:"payload"`
}

type GameState struct {
	Players   []Player   `json:"players"`
	Computers []Computer `json:"computers"`
	Villages  []Village  `json:"villages"`
	Resources []Resource `json:"resources"`
}

type Player struct {
	ID   string `json:"id"`
	PosX int    `json:"posXHex"`
	PosY int    `json:"posYHex"`
}

type PlayerPosition struct {
	ID   string `json:"id"`
	PosX int    `json:"posXHex"`
	PosY int    `json:"posYHex"`
}

type Computer struct {
	ID   string  `json:"id"`
	PosX float64 `json:"posXHex"`
	PosY float64 `json:"posYHex"`
}

type Village struct {
	ID   string `json:"id"`
	PosX int    `json:"posXHex"`
	PosY int    `json:"posYHex"`
}

type Resource struct {
	ID   string `json:"id"`
	PosX int    `json:"posXHex"`
	PosY int    `json:"posYHex"`
}

type Position struct {
	PosX int `json:"posXHex"`
	PosY int `json:"posYHex"`
}
