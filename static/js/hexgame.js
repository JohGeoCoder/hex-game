
const a = 2 * Math.PI / 6
const r = 15

class HexGame {

    canvasEl = null
    canvasContext = null

    offsetX = 0
    offsetY = 0

    constructor() {
        const canvas = document.getElementById('canvas')
        this.canvasEl = canvas
        this.canvasContext = canvas.getContext('2d')

        this.offsetX = (canvas.offsetWidth - r) / 2
        this.offsetY = (canvas.offsetHeight - r) / 2
    }

    getCanvasContext() {
        return this.canvasContext
    }

    getCanvasElement() {
        return this.canvasEl
    }    

    getOffset() {
        return [this.offsetX, this.offsetY]
    }
}

class GameState {
    // This player data. Coordinates in Hex
    homePlayer = {
        id: '',
        posXHex: 0,
        posYHex: 0
    }

    // All the relevant game data sent from the server.
    // This gets regularly updated from the socket connection.
    serverState = {
        players: []
    }

    pressedKeys = {}

    constructor() {
        let playerId = crypto.randomUUID()
        this.homePlayer.id = playerId
    }

    getPressedKeys() {
        return { ...this.pressedKeys }
    }

    setPressedKey(keyCode, isPressed) {
        this.pressedKeys = {
            ...this.pressedKeys,
            [keyCode]: isPressed
        }
    }

    getHomePlayerId() {
        return this.homePlayer.id
    }

    getServerState() {
        return { ...this.serverState }
    }

    getHomePlayerServerState() {
        let pSearch = this.serverState.players.filter(p => p.id === this.homePlayer.id)
        if (pSearch.length) {
            return { ...pSearch[0] }
        }

        return null
    }

    getHomePlayerLocalState() {
        return { ...this.homePlayer }
    }

    setServerState(state) {
        this.serverState = state
    }

    setHomePlayerPosition(hexX, hexY) {
        this.homePlayer = {
            ...this.homePlayer,
            posXHex: hexX,
            posYHex: hexY
        }
    }
}

class GameDrawer {
    game = null
    gameState = null

    constructor(game, gameState) {
        this.game = game
        this.gameState = gameState
        this.beginDrawTicker(120)
    }

    beginDrawTicker(freq) {
        let canvasContext = this.game.getCanvasContext()
        setInterval(() => {
            canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height)
            this.drawGrid(canvasContext)

            let serverState = this.gameState.getServerState()
            this.drawServerState(serverState)

            let pressedKeys = this.gameState.getPressedKeys()
            this.drawLocalState(pressedKeys)
        }, 1000 / freq)
    }

    drawServerState(serverState) {
        const [offsetX, offsetY] = this.game.getOffset()
        for (let i = 0; i < serverState.players.length; i++) {
            const element = serverState.players[i];
            this.fillHexagon(hexCoordsToCanvas(element.posXHex, element.posYHex, offsetX, offsetY))
        }
        
        let homePlayer = this.gameState.getHomePlayerServerState()
        if (homePlayer) {
            document.getElementById('position').textContent = `{${homePlayer.posXHex},${homePlayer.posYHex}}`
        }
    }

    drawLocalState(pressedKeys) {
        for (const [key, value] of Object.entries(pressedKeys)) {
            let el = document.getElementById(key)
            if (el) {
                el.textContent = `${value}`
            }
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
    gameState = null

    constructor(game, gameState) {
        this.game = game
        this.gameState = gameState
        this.beginLocalCanvasEventListeners()
    }

    beginLocalCanvasEventListeners() {
        const [offsetX, offsetY] = this.game.getOffset()

        // this.game.getCanvasElement().addEventListener('mousemove', (e) => {    
        //     let canvasX = e.offsetX
        //     let canvasY = e.offsetY
        //     const [hexX, hexY] = canvasCoordsToHex(canvasX, canvasY, offsetX, offsetY)
        //     this.gameState.setHomePlayerPosition(hexX, hexY)
        // })

        window.addEventListener('keydown', (event) => {
            this.gameState.setPressedKey(event.code, true)
        })

        window.addEventListener('keyup', (event) => {
            this.gameState.setPressedKey(event.code, false)
        })

        window.addEventListener('keypress', (event) => {
            console.log(event.code)
            let p = this.gameState.getHomePlayerLocalState()
            if (event.code === 'KeyW') {
                this.gameState.setHomePlayerPosition(p.posXHex, p.posYHex - 1)
            }
            if (event.code === 'KeyA') {
                this.gameState.setHomePlayerPosition(p.posXHex - 1, p.posYHex)
            }
            if (event.code === 'KeyS') {
                this.gameState.setHomePlayerPosition(p.posXHex, p.posYHex + 1)
            }
            if (event.code === 'KeyD') {
                this.gameState.setHomePlayerPosition(p.posXHex + 1, p.posYHex)
            }
        })
    }
}

class ServerComm {
    game = null
    gameState = null
    webSocket = null

    // The last state of this player sent to the server.
    // This aids an optimization to minimize the number
    // of state updates sent to the server.
    lastSentHomePlayer = {
        id: '',
        posXHex: -1,
        posYHex: -1
    }

    constructor(game, gameState) {
        this.game = game
        this.gameState = gameState
        
        let playerId = this.gameState.getHomePlayerId()

        const ws = new WebSocket(`ws://localhost:5001/ws?id=${playerId}`)
        this.webSocket = ws

        ws.onopen = () => {
            this.beginSendTicker(120)
        }

        ws.onmessage = (event) => {
            this.gameState.setServerState(JSON.parse(event.data))
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
            let homePlayerLocalState = this.gameState.getHomePlayerLocalState()
            if(!_.isEqual(homePlayerLocalState, this.lastSentHomePlayer)) {
    
                let gameMessage = {
                    gameMessageType: 'playerstate',
                    payload: JSON.stringify(homePlayerLocalState)
                }
    
                this.webSocket.send(JSON.stringify(gameMessage))
                this.lastSentHomePlayer = homePlayerLocalState
            }
        }, 1000 / freq)
    }

    getLastSentHomePlayerState() {
        return this.lastSentHomePlayer
    }
}

function init() {
    Game = new HexGame()
    State = new GameState()
    Drawer = new GameDrawer(Game, State)
    IListener = new InputListener(Game, State)
    Server = new ServerComm(Game, State)
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