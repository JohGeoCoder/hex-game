
const a = 2 * Math.PI / 6
const r = 50
const offsetX = 50
const offsetY = 50

var mouseCanvasCoords = {
    mouseCanvasX: 0,
    mouseCanvasY: 0
}

var localGameState = {
    mouseHexX: 0,
    mouseHexY: 0
}

var lastSentGameState = {
    mouseHexX: -1,
    mouseHexY: -1
}

var gameStateFromServer = {
    mouseHexX: 0,
    mouseHexY: 0
}

function init() {
    const ws = new WebSocket("ws://localhost:5001/ws")

    ws.onopen = (event) => {
        console.log("OPEN")
        beginLocalCanvasEventListeners()
        let canvasContext = startCanvas()
        beginDrawTicker(canvasContext, 120)
        beginSendTicker(ws, 120)
    }

    ws.onmessage = (event) => {
        gameStateFromServer = JSON.parse(event.data)
        console.log(gameStateFromServer)
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
    fillHexagon(canvasContext, hexCoordsToCanvas(state.mouseHexX, state.mouseHexY))
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
            mouseCanvasX: e.offsetX,
            mouseCanvasY: e.offsetY
        }

        const [hexX, hexY] = canvasCoordsToHex(mouseCanvasCoords.mouseCanvasX, mouseCanvasCoords.mouseCanvasY)
        localGameState = {
            mouseHexX: hexX,
            mouseHexY: hexY
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
        if(!_.isEqual(localGameState, lastSentGameState)) {
            webSocket.send(JSON.stringify(localGameState))
            lastSentGameState = localGameState
        }
    }, 1000 / freq)
}

init()