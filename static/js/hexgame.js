
const a = 2 * Math.PI / 6
const r = 50
const offsetX = 50
const offsetY = 50

var mouseCanvasCoords = {
    posXCanvas: 0,
    posYCanvas: 0
}

var playerState = {
    id: '',
    posXHex: 0,
    posYHex: 0
}

var lastSentPlayerState = {
    posXHex: -1,
    posYHex: -1
}

var gameStateFromServer = {
    players: []
}

function init() {
    playerState.id = crypto.randomUUID()
    const ws = new WebSocket(`ws://localhost:5001/ws?id=${playerState.id}`)

    ws.onopen = (event) => {
        console.log("OPEN")
        beginLocalCanvasEventListeners()
        let canvasContext = startCanvas()
        beginDrawTicker(canvasContext, 120)
        beginSendTicker(ws, 120)
    }

    ws.onmessage = (event) => {
        gameStateFromServer = JSON.parse(event.data)
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

function drawGrid(canvasContext) {
    for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 5; y++) {
            drawHexagon(canvasContext, hexCoordsToCanvas(x, y))
        } 
    }
    for (let x = 2; x < 10; x += 2) {
        for (let y = (- x / 2); y < 0; y++) {
            drawHexagon(canvasContext, hexCoordsToCanvas(x, y))
        } 
    }
    for (let x = 3; x < 10; x += 2) {
        for (let y = ((1 - x) / 2); y < 0; y++) {
            drawHexagon(canvasContext, hexCoordsToCanvas(x, y))
        } 
    }
    for (let x = 8; x >= 0; x -= 2) {
        for (let y = (5 - (x - 8) / 2); y >= 5; y--) {
            drawHexagon(canvasContext, hexCoordsToCanvas(x, y))
        } 
    }
    for (let x = 7; x >= 0; x -= 2) {
        for (let y = (5 - (1 + x - 8) / 2); y >= 5; y--) {
            drawHexagon(canvasContext, hexCoordsToCanvas(x, y))
        } 
    }
}

function drawState(canvasContext, state) {
    for (let i = 0; i < state.players.length; i++) {
        const element = state.players[i];
        fillHexagon(canvasContext, hexCoordsToCanvas(element.posXHex, element.posYHex))
    }
}

function startCanvas() {
    const canvas = document.getElementById('canvas')
    const ctx = canvas.getContext('2d')

    return ctx
}

function beginLocalCanvasEventListeners() {
    const canvas = document.getElementById('canvas')

    canvas.addEventListener('mousemove', (e) => {
        mouseCanvasCoords = {
            ...mouseCanvasCoords,
            posXCanvas: e.offsetX,
            posYCanvas: e.offsetY
        }

        const [hexX, hexY] = canvasCoordsToHex(mouseCanvasCoords.posXCanvas, mouseCanvasCoords.posYCanvas)
        playerState = {
            ...playerState,
            posXHex: hexX,
            posYHex: hexY
        }
    })
}

function drawHexagon(ctx, hexCoords) {
    const [hexX, hexY] = hexCoords

    ctx.beginPath()
    for (var i = 0; i < 6; i++) {
        ctx.lineTo(hexX + r * Math.cos(a * i), hexY + r * Math.sin(a * i));
    }
    ctx.closePath()
    ctx.stroke()
}

function fillHexagon(ctx, hexCoords) {
    const [hexX, hexY] = hexCoords

    ctx.fillStyle = '#AAA'

    ctx.beginPath()
    for (var i = 0; i < 6; i++) {
        ctx.lineTo(hexX + r * Math.cos(a * i), hexY + r * Math.sin(a * i));
    }
    ctx.fill()
    ctx.closePath()
}

function hexCoordsToCanvas(hexX, hexY) {
    let canvasX = offsetX + (r * hexX) * (1 + Math.cos(a))
    let canvasY = offsetY + (r * hexX * Math.sin(a)) + (2 * hexY * r * Math.sin(a))
    return [canvasX, canvasY]
}

function canvasCoordsToHex(canvasX, canvasY) {
    let hexX = (canvasX - offsetX) / (r * (1 + Math.cos(a)))
    let hexY = (canvasY - offsetY - (r * hexX * Math.sin(a))) / (2 * r * Math.sin(a))

    hexX = Math.round(hexX)
    hexY = Math.round(hexY)

    return [hexX, hexY]
}

function beginDrawTicker(canvasContext, freq) {
    setInterval(() => {
        canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height)
        drawGrid(canvasContext)
        drawState(canvasContext, { ...gameStateFromServer })
    }, 1000 / freq)
}

function beginSendTicker(webSocket, freq) {
    setInterval(() => {
        if(!_.isEqual(playerState, lastSentPlayerState)) {

            let gameMessage = {
                gameMessageType: 'playerstate',
                payload: JSON.stringify(playerState)
            }

            webSocket.send(JSON.stringify(gameMessage))
            lastSentPlayerState = playerState
        }
    }, 1000 / freq)
}

init()