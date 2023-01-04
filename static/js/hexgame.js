
const a = 2 * Math.PI / 6
const r = 50

class HexGame {
    posEl = null
    canvasEl = null
    canvasContext = null
    webSocket = null
    offsetX = 0
    offsetY = 0

    // Mouse X,Y coordinates on the HTML canvas
    canvasCoords = {
        posXCanvas: 0,
        posYCanvas: 0
    }

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
        this.playerState.id = crypto.randomUUID()

        const canvas = document.getElementById('canvas')
        this.canvasEl = canvas
        this.canvasContext = canvas.getContext('2d')

        this.offsetX = 50
        this.offsetY = 50

        const ws = new WebSocket(`ws://localhost:5001/ws?id=${this.playerState.id}`)
        this.webSocket = ws

        ws.onopen = () => {
            this.beginLocalCanvasEventListeners()
            this.beginSendTicker(120)
        }

        ws.onmessage = (event) => {
            this.gameStateFromServer = JSON.parse(event.data)
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

    beginLocalCanvasEventListeners() {    
        this.canvasEl.addEventListener('mousemove', (e) => {
            this.mouseCanvasCoords = {
                ...this.mouseCanvasCoords,
                posXCanvas: e.offsetX,
                posYCanvas: e.offsetY
            }
    
            let canvasX = this.mouseCanvasCoords.posXCanvas
            let canvasY = this.mouseCanvasCoords.posYCanvas
            const [hexX, hexY] = canvasCoordsToHex(canvasX, canvasY, this.offsetX, this.offsetY)
            this.playerState = {
                ...this.playerState,
                posXHex: hexX,
                posYHex: hexY
            }
        })
    }

    beginSendTicker(freq) {
        setInterval(() => {
            if(!_.isEqual(this.playerState, this.lastSentPlayerState)) {
    
                let gameMessage = {
                    gameMessageType: 'playerstate',
                    payload: JSON.stringify(this.playerState)
                }
    
                this.webSocket.send(JSON.stringify(gameMessage))
                this.lastSentPlayerState = this.playerState
            }
        }, 1000 / freq)
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

    getThisPlayer() {
        let pSearch = this.gameStateFromServer.players.filter(p => p.id === this.playerState.id)

        if (pSearch.length === 0) {
            return null
        }

        return pSearch[0]
    }

    getOffset() {
        return [this.offsetX, this.offsetY]
    }
}

class GameDrawer {
    hexGame = null

    constructor(game) {
        this.hexGame = game
        this.beginDrawTicker(120)
    }

    beginDrawTicker(freq) {
        let canvasContext = this.hexGame.getCanvasContext()
        setInterval(() => {
            canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height)
            this.drawGrid(canvasContext)

            let gameState = this.hexGame.getGameState()
            this.drawGameState(canvasContext, gameState)
    
            let thisPlayer = this.hexGame.getThisPlayer()
            if (thisPlayer) {
                this.hexGame.setPositionEl(thisPlayer.posXHex, thisPlayer.posYHex)
            }
        }, 1000 / freq)
    }

    drawGameState() {
        const [offsetX, offsetY] = this.hexGame.getOffset()
        let state = this.hexGame.getGameState()
        for (let i = 0; i < state.players.length; i++) {
            const element = state.players[i];
            this.fillHexagon(hexCoordsToCanvas(element.posXHex, element.posYHex, offsetX, offsetY))
        }
    }

    drawGrid() {
        const [offsetX, offsetY] = this.hexGame.getOffset()

        for (let x = 0; x < 10; x++) {
            for (let y = 0; y < 5; y++) {
                this.drawHexagon(hexCoordsToCanvas(x, y, offsetX, offsetY))
            } 
        }
        for (let x = 2; x < 10; x += 2) {
            for (let y = (- x / 2); y < 0; y++) {
                this.drawHexagon(hexCoordsToCanvas(x, y, offsetX, offsetY))
            } 
        }
        for (let x = 3; x < 10; x += 2) {
            for (let y = ((1 - x) / 2); y < 0; y++) {
                this.drawHexagon(hexCoordsToCanvas(x, y, offsetX, offsetY))
            } 
        }
        for (let x = 8; x >= 0; x -= 2) {
            for (let y = (5 - (x - 8) / 2); y >= 5; y--) {
                this.drawHexagon(hexCoordsToCanvas(x, y, offsetX, offsetY))
            } 
        }
        for (let x = 7; x >= 0; x -= 2) {
            for (let y = (5 - (1 + x - 8) / 2); y >= 5; y--) {
                this.drawHexagon(hexCoordsToCanvas(x, y, offsetX, offsetY))
            } 
        }
    }

    drawHexagon(hexCoords) {
        let canvasContext = this.hexGame.getCanvasContext()
        const [hexX, hexY] = hexCoords
    
        canvasContext.beginPath()
        for (var i = 0; i < 6; i++) {
            canvasContext.lineTo(hexX + r * Math.cos(a * i), hexY + r * Math.sin(a * i));
        }
        canvasContext.closePath()
        canvasContext.stroke()
    }

    fillHexagon(hexCoords) {
        let canvasContext = this.hexGame.getCanvasContext()
        const [hexX, hexY] = hexCoords
    
        canvasContext.fillStyle = '#AAA'
    
        canvasContext.beginPath()
        for (var i = 0; i < 6; i++) {
            canvasContext.lineTo(hexX + r * Math.cos(a * i), hexY + r * Math.sin(a * i));
        }
        canvasContext.fill()
        canvasContext.closePath()
    }
    
}

function init() {
    Game = new HexGame()
    GameDrawer = new GameDrawer(Game)
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