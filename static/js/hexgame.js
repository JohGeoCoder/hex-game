
const a = 2 * Math.PI / 6
const r = 15

class HexGame {
    posEl = null
    canvasEl = null
    canvasContext = null
    offsetX = 0
    offsetY = 0

    // This player data. Coordinates in Hex
    playerState = {
        id: '',
        posXHex: 0,
        posYHex: 0
    }

    // The last state of this player sent to the server.
    // This aids an optimization to minimize the number
    // of state updates sent to the server.
    lastSentPlayerState = {
        id: '',
        posXHex: -1,
        posYHex: -1
    }

    // All the relevant game data sent from the server.
    // This gets regularly updated from the socket connection.
    gameStateFromServer = {
        players: []
    }

    constructor() {
        this.posEl = document.getElementById('position')

        const canvas = document.getElementById('canvas')
        this.canvasEl = canvas
        this.canvasContext = canvas.getContext('2d')

        this.offsetX = (canvas.offsetWidth - r) / 2
        this.offsetY = (canvas.offsetHeight - r) / 2
    }

    setPlayerId(id) {
        this.playerState.id = id
    }

    setPositionEl(x, y) {
        this.posEl.textContent = `{${x},${y}}`
    }

    getGameState() {
        return { ...this.gameStateFromServer }
    }

    getCanvasContext() {
        return this.canvasContext
    }

    getCanvasElement() {
        return this.canvasEl
    }

    getThisPlayer() {
        let pSearch = this.gameStateFromServer.players.filter(p => p.id === this.playerState.id)
        if (pSearch.length) {
            return pSearch[0]
        }

        return null
    }

    getThisPlayerState() {
        return this.playerState
    }

    getLastSentPlayerState() {
        return this.lastSentPlayerState
    }

    setLastSentPlayerState(playerState) {
        this.lastSentPlayerState = playerState
    }

    setGameState(gameState) {
        this.gameStateFromServer = gameState
    }

    getOffset() {
        return [this.offsetX, this.offsetY]
    }

    setPlayerHexPosition(hexX, hexY) {
        this.playerState = {
            ...this.playerState,
            posXHex: hexX,
            posYHex: hexY
        }
    }
}

class GameDrawer {
    game = null

    constructor(game) {
        this.game = game
        this.beginDrawTicker(120)
    }

    beginDrawTicker(freq) {
        let canvasContext = this.game.getCanvasContext()
        setInterval(() => {
            canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height)
            this.drawGrid(canvasContext)

            let gameState = this.game.getGameState()
            this.drawGameState(canvasContext, gameState)
    
            let thisPlayer = this.game.getThisPlayer()
            if (thisPlayer) {
                this.game.setPositionEl(thisPlayer.posXHex, thisPlayer.posYHex)
            }
        }, 1000 / freq)
    }

    drawGameState() {
        const [offsetX, offsetY] = this.game.getOffset()
        let state = this.game.getGameState()
        for (let i = 0; i < state.players.length; i++) {
            const element = state.players[i];
            this.fillHexagon(hexCoordsToCanvas(element.posXHex, element.posYHex, offsetX, offsetY))
        }
    }

    drawGrid() {
        const [offsetX, offsetY] = this.game.getOffset()

        let clusterRadius = 7

        let radialDistance = (clusterRadius - 1)

        const adjacentClusterCenters = [
            [0, 0],
            [-radialDistance, -radialDistance],
            [radialDistance, 2 * -radialDistance],
            [2 * radialDistance, -radialDistance],
            [radialDistance, radialDistance],
            [-radialDistance, 2 * radialDistance],
            [2 * -radialDistance, radialDistance]
        ]

        for (let w = 0; w < adjacentClusterCenters.length; w++) {

            const [hexOffsetX, hexOffsetY] = adjacentClusterCenters[w]

            // Draw the hexagon cluster cross lines
            for (let i = -clusterRadius + 1; i < clusterRadius; i++) {
                this.drawHexagon(hexCoordsToCanvas(hexOffsetX + 0, hexOffsetY + i, offsetX, offsetY))
                this.drawHexagon(hexCoordsToCanvas(hexOffsetX + i, hexOffsetY + 0, offsetX, offsetY))
                this.drawHexagon(hexCoordsToCanvas(hexOffsetX + i, hexOffsetY + -i, offsetX, offsetY))
            }

            // Draw the southwest border triangle
            let x = -1
            let y = 2
            for (let i = 0; i < clusterRadius - 2; i++) {
                for (let j = i; j < clusterRadius - 2; j++) {
                    this.drawHexagon(hexCoordsToCanvas(hexOffsetX + x - i, hexOffsetY + y + j, offsetX, offsetY))
                }
            }

            // Draw the southeast border triangle
            x = 1
            y = 1
            for (let i = 0; i < clusterRadius - 2; i++) {
                for (let j = i; j < clusterRadius - 2; j++) {
                    this.drawHexagon(hexCoordsToCanvas(hexOffsetX + (clusterRadius - 3) + x - j, hexOffsetY + y + i, offsetX, offsetY))
                }
            }

            // Draw the east border triangle
            x = 2
            y = -1
            for (let i = 0; i < clusterRadius - 2; i++) {
                for (let j = i; j < clusterRadius - 2; j++) {
                    this.drawHexagon(hexCoordsToCanvas(hexOffsetX + x + j, hexOffsetY + y - i, offsetX, offsetY))
                }
            }

            // Draw the northeast border triangle
            x = 1
            y = -2
            for (let i = 0; i < clusterRadius - 2; i++) {
                for (let j = i; j < clusterRadius - 2; j++) {
                    this.drawHexagon(hexCoordsToCanvas(hexOffsetX + x + i, hexOffsetY + y - j, offsetX, offsetY))
                }
            }

            // Draw the northwest border triangle
            x = -1
            y = -1
            for (let i = 0; i < clusterRadius - 2; i++) {
                for (let j = i; j < clusterRadius - 2; j++) {
                    this.drawHexagon(hexCoordsToCanvas(hexOffsetX + x - i, hexOffsetY + y + j - (clusterRadius - 3), offsetX, offsetY))
                }
            }

            // Draw the west border triangle
            x = -2
            y = 1
            for (let i = 0; i < clusterRadius - 2; i++) {
                for (let j = i; j < clusterRadius - 2; j++) {
                    this.drawHexagon(hexCoordsToCanvas(hexOffsetX + x - j, hexOffsetY + y + i, offsetX, offsetY))
                }
            }
        }
    }

    drawHexagon(hexCoords) {
        let canvasContext = this.game.getCanvasContext()
        const [hexX, hexY] = hexCoords
    
        canvasContext.beginPath()
        for (var i = 0; i < 6; i++) {
            canvasContext.lineTo(hexX + r * Math.cos(a * i), hexY + r * Math.sin(a * i));
        }
        canvasContext.closePath()
        canvasContext.stroke()
    }

    fillHexagon(hexCoords) {
        let canvasContext = this.game.getCanvasContext()
        const [hexX, hexY] = hexCoords
    
        canvasContext.fillStyle = '#AAA'
    
        canvasContext.beginPath()
        for (var i = 0; i < 6; i++) {
            canvasContext.lineTo(hexX + r * Math.cos(a * i), hexY + r * Math.sin(a * i));
        }
        canvasContext.closePath()
        canvasContext.fill()
    }
    
}

class InputListener {
    game = null

    hexX = 0
    hexY = 0

    constructor(game) {
        this.game = game
        this.beginLocalCanvasEventListeners()
    }

    beginLocalCanvasEventListeners() {
        const [offsetX, offsetY] = this.game.getOffset()

        this.game.getCanvasElement().addEventListener('mousemove', (e) => {    
            let canvasX = e.offsetX
            let canvasY = e.offsetY
            const [hexX, hexY] = canvasCoordsToHex(canvasX, canvasY, offsetX, offsetY)
            this.game.setPlayerHexPosition(hexX, hexY)
        })
    }
}

class ServerComm {
    game = null
    webSocket = null

    constructor(game) {
        this.game = game

        let playerId = crypto.randomUUID()
        this.game.setPlayerId(playerId)

        const ws = new WebSocket(`ws://localhost:5001/ws?id=${playerId}`)
        this.webSocket = ws

        ws.onopen = () => {
            this.beginSendTicker(120)
        }

        ws.onmessage = (event) => {
            this.game.setGameState(JSON.parse(event.data))
        }
        
        ws.onerror = (event) => {
            console.log("ERROR")
            console.log(event)
        }
        
        ws.onclose = (event) => {
            console.log("CLOSE")
            console.log(event)
        }
    }

    beginSendTicker(freq) {
        setInterval(() => {
            let playerState = this.game.getThisPlayerState()
            if(!_.isEqual(playerState, this.game.getLastSentPlayerState())) {
    
                let gameMessage = {
                    gameMessageType: 'playerstate',
                    payload: JSON.stringify(playerState)
                }
    
                this.webSocket.send(JSON.stringify(gameMessage))
                this.game.setLastSentPlayerState(playerState)
            }
        }, 1000 / freq)
    }
}

function init() {
    Game = new HexGame()
    GameDrawer = new GameDrawer(Game)
    InputListener = new InputListener(Game)
    Server = new ServerComm(Game)
}

function hexCoordsToCanvas(hexX, hexY, offsetX, offsetY) {
    let canvasX = offsetX + (r * hexX) * (1 + Math.cos(a))
    let canvasY = offsetY + (r * hexX * Math.sin(a)) + (2 * hexY * r * Math.sin(a))
    return [canvasX, canvasY]
}

function canvasCoordsToHex(canvasX, canvasY, offsetX, offsetY) {
    let hexX = (canvasX - offsetX) / (r * (1 + Math.cos(a)))
    let hexY = (canvasY - offsetY - (r * hexX * Math.sin(a))) / (2 * r * Math.sin(a))

    hexX = Math.round(hexX)
    hexY = Math.round(hexY)

    return [hexX, hexY]
}

init()