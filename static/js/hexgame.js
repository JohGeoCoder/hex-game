
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

        this.offsetX = (canvas.offsetWidth - r) / 2
        this.offsetY = (canvas.offsetHeight - r) / 2

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
        if (pSearch.length) {
            return pSearch[0]
        }

        return null
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

        // for (let i = -3; i <= 3; i++) {
        //     for (let j = -3; j <= 3; j++) {
        //         this.drawHexagon(hexCoordsToCanvas(i, j, offsetX, offsetY))
        //     }
        //     this.drawHexagon(hexCoordsToCanvas(0, i, offsetX, offsetY))
        // }

        for (let i = -4; i <=4; i++) {
            this.drawHexagon(hexCoordsToCanvas(0, i, offsetX, offsetY))
            this.drawHexagon(hexCoordsToCanvas(i, 0, offsetX, offsetY))
            this.drawHexagon(hexCoordsToCanvas(i, -i, offsetX, offsetY))
        }

        for (let i = 0; i < 3; i++) {
            for (let j = i; j < 3; j++) {
                let x = -1
                let y = 2
                this.drawHexagon(hexCoordsToCanvas(x - i, y + j, offsetX, offsetY))

                x = 1
                y = 1
                this.drawHexagon(hexCoordsToCanvas(2 + x - j, y + i, offsetX, offsetY))

                x = 2
                y = -1
                this.drawHexagon(hexCoordsToCanvas(x + j, y - i, offsetX, offsetY))

                x = 1
                y = -2
                this.drawHexagon(hexCoordsToCanvas(x + i, y - j, offsetX, offsetY))

                x = -1
                y = -1
                this.drawHexagon(hexCoordsToCanvas(x - i, y + j - 2, offsetX, offsetY))

                x = -2
                y = 1
                this.drawHexagon(hexCoordsToCanvas(x - j, y + i, offsetX, offsetY))
            }
        }


        // let x = -1
        // let y = 2
        // for (let i = 0; i < 3; i++) {
        //     for (let j = i; j < 3; j++) {
        //         this.drawHexagon(hexCoordsToCanvas(x - i, y + j, offsetX, offsetY))
        //     }
        // }

        // x = 4
        // y = -3
        // for (let i = 0; i < 3; i++) {
        //     for (let j = i; j < 3; j++) {
        //         this.drawHexagon(hexCoordsToCanvas(x - i, y + j, offsetX, offsetY))
        //     }
        // }

        // x = -1
        // y = -3
        // for (let i = 0; i < 3; i++) {
        //     for (let j = i; j < 3; j++) {
        //         this.drawHexagon(hexCoordsToCanvas(x - i, y + j, offsetX, offsetY))
        //     }
        // }

        // x = -2
        // y = 1
        // for (let i = 0; i < 3; i++) {
        //     for (let j = i; j < 3; j++) {
        //         this.drawHexagon(hexCoordsToCanvas(x - j, y + i, offsetX, offsetY))
        //     }
        // }

        // x = 3
        // y = -4
        // for (let i = 0; i < 3; i++) {
        //     for (let j = i; j < 3; j++) {
        //         this.drawHexagon(hexCoordsToCanvas(x - j, y + i, offsetX, offsetY))
        //     }
        // }

        // x = 3
        // y = 1
        // for (let i = 0; i < 3; i++) {
        //     for (let j = i; j < 3; j++) {
        //         this.drawHexagon(hexCoordsToCanvas(x - j, y + i, offsetX, offsetY))
        //     }
        // }
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