const exampleSocket = new WebSocket("ws://localhost:5001/ws")


exampleSocket.onmessage = (event) => {
    console.log("MESSAGE")
    console.log(event.data)
}

exampleSocket.onerror = (event) => {
    console.log("ERROR")
    console.log(event)
}

exampleSocket.onopen = (event) => {
    console.log("OPEN")
    console.log(event)
    exampleSocket.send("Hello World!")
}

exampleSocket.onclose = (event) => {
    console.log("CLOSE")
    console.log(event)
}